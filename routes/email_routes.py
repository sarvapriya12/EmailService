import logging
import time

from fastapi import APIRouter, Depends, HTTPException

from schemas.email import EmailRequest, EmailResponse
from schemas.pubsub import PubSubPushRequest
from services.auth_guard import get_current_user
from services.email_pipeline_service import EmailPipelineService
from services.gmail_service import GmailService
from services.gmail_watch_service import GmailWatchService
from services.subscription_service import check_quota, increment_usage
from config.settings import settings
from services.database import lock_message_for_processing, mark_as_processed, get_last_history_id, update_last_history_id

logger = logging.getLogger(__name__)

router = APIRouter()

# --- In-Memory Debounce Caches ---
RECENT_HISTORY_IDS: dict[str, float] = {}
RECENT_MESSAGE_IDS: dict[str, float] = {}

def _is_recently_seen(id_str: str, cache: dict[str, float], ttl: int = 60) -> bool:
    now = time.time()
    if id_str in cache and (now - cache[id_str] < ttl):
        return True
    cache[id_str] = now
    if len(cache) > 1000:
        keys_to_del = [k for k, v in cache.items() if now - v > ttl]
        for k in keys_to_del:
            del cache[k]
        if len(cache) > 1000:
            cache.clear()
    return False

@router.post("/process-email")
def process_email(
    email_request: EmailRequest,
    current_user: dict = Depends(get_current_user),
) -> EmailResponse:
    try:
        user_id = current_user["user_id"]

        if not check_quota(user_id):
            raise HTTPException(
                status_code=429,
                detail="Email quota exceeded. Please upgrade your plan."
            )

        pipeline = EmailPipelineService(user_id=current_user["user_id"])
        result = pipeline.process_incoming_email(
            sender_email=email_request.sender_email,
            subject=email_request.subject,
            body=email_request.body,
        )

        increment_usage(user_id)
        return result

    except HTTPException:
        raise
    except RuntimeError:
        raise HTTPException(status_code=503, detail="All LLM providers failed")
    except Exception as exc:
        logger.error("process-email failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/gmail/watch")
def watch_gmail(
    current_user: dict = Depends(get_current_user),
) -> dict[str, object]:
    try:
        gmail = GmailService()
        result = gmail.watch_inbox()

        if result.get("status") == "failed":
            raise HTTPException(
                status_code=503,
                detail=result.get("error", "Gmail watch failed")
            )

        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("gmail/watch failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/gmail/push")
def gmail_push(notification: PubSubPushRequest) -> dict[str, object]:
    try:
        listener = GmailWatchService()
        notification_data = listener.parse_notification(notification)
        logger.info("Gmail push received for history_id=%s", notification_data["history_id"])
        incoming_history_id = notification_data["history_id"]
        logger.info("Gmail push received for history_id=%s", incoming_history_id)

        # 0. In-Memory Debounce (Prevents Race Conditions)
        if _is_recently_seen(str(incoming_history_id), RECENT_HISTORY_IDS, ttl=60):
            logger.info("Debounced duplicate push in memory: history_id=%s", incoming_history_id)
            return {"status": "ignored", "reason": "debounced_in_memory"}

        last_history_id = get_last_history_id()

        # 1. Strict History ID Tracking (Webhook Debounce)
        try:
            if int(incoming_history_id) <= int(last_history_id):
                logger.info("Ignoring duplicate/old push. Incoming: %s, Stored: %s", incoming_history_id, last_history_id)
                return {"status": "ignored", "reason": "old_notification"}
        except ValueError:
            pass  # Fallback if history_id is somehow not numeric

        gmail = GmailService()
        # Use stored history ID instead of notification history ID
        last_history_id = get_last_history_id()
        message_data = gmail.fetch_latest_message_since(last_history_id)

        # Update stored history ID to move the cursor forward
        update_last_history_id(incoming_history_id)

        if message_data.get("status") in ("failed", "no_new_messages"):
            logger.info("Skipping push — reason: %s", message_data.get("error"))
            return {
                "status": "ignored",
                "reason": message_data.get("error"),
            }

        sender_lower = message_data.get("sender_email", "").lower()
        
        # Skip emails sent by the system itself
        if sender_lower == settings.GMAIL_SENDER_EMAIL:
            logger.info("Skipping outbound email from self")
            return {"status": "ignored", "reason": "outbound_email"}
            
        # Skip bounce and auto-reply emails
        if sender_lower.startswith("mailer-daemon@") or sender_lower.startswith("postmaster@") or "noreply@" in sender_lower or "no-reply@" in sender_lower:
            logger.info("Skipping automated/bounce email from %s", sender_lower)
            return {"status": "ignored", "reason": "automated_email"}

        message_id = message_data.get("message_id")

        # 2. In-Memory Message ID Debounce (Saves Supabase DB Calls)
        if message_id and _is_recently_seen(str(message_id), RECENT_MESSAGE_IDS, ttl=300):
            logger.info("Debounced duplicate message in memory: message_id=%s", message_id)
            return {"status": "ignored", "reason": "duplicate_message_in_memory"}

        if not lock_message_for_processing(message_id, message_data["sender_email"], message_data["subject"]):
            logger.info("Skipping duplicate message: %s", message_id)
            return {"status": "ignored", "reason": "duplicate"}

        pipeline = EmailPipelineService(gmail=gmail, user_id=None)
        processing_result = pipeline.process_incoming_email(
            sender_email=message_data["sender_email"],
            subject=message_data["subject"],
            body=message_data["body"],
            gmail_message_id=message_data.get("message_id"),
            
        )
        # Future (per-user)
            # pipeline = EmailPipelineService(gmail=gmail, user_id=user_id_from_gmail_token_lookup)
        


        mark_as_processed(
            gmail_message_id=message_id,
            status=processing_result.gmail_status,
        )

        logger.info("Pipeline complete for message: %s", message_id)

        return {
            "notification": notification_data,
            "message": message_data,
            "processing": processing_result.model_dump(),
        }

    except ValueError as exc:
        logger.error("Push failed — invalid payload: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail=str(exc))

    except HTTPException:
        raise

    except Exception as exc:
        logger.error("GMAIL PUSH FAILED: %s", exc, exc_info=True)
        return {"status": "error", "detail": str(exc)}


@router.get("/subscription/status")
def subscription_status(
    current_user: dict = Depends(get_current_user),
) -> dict:
    from services.subscription_service import get_subscription_info
    user_id = current_user["user_id"]
    return get_subscription_info(user_id)