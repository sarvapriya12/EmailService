import logging
import time
import threading

from fastapi import APIRouter, Depends, HTTPException

from schemas.email import EmailRequest, EmailResponse
from schemas.pubsub import PubSubPushRequest
from services.auth_guard import get_current_user
from services.email_pipeline_service import EmailPipelineService
from services.gmail_service import GmailService
from services.gmail_watch_service import GmailWatchService
from services.subscription_service import check_quota, increment_usage
from tasks.email_tasks import process_email_background_task
from config.settings import settings
from services.database import acquire_idempotency_lock, mark_as_processed, get_last_history_id, update_last_history_id

logger = logging.getLogger(__name__)

router = APIRouter()

# --- In-Memory Debounce Caches ---
RECENT_HISTORY_IDS: dict[str, float] = {}
RECENT_MESSAGE_IDS: dict[str, float] = {}
_CACHE_LOCK = threading.Lock()

def _is_recently_seen(id_str: str, cache: dict[str, float], ttl: int = 60) -> bool:
    now = time.time()
    with _CACHE_LOCK:
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
) -> dict:
    try:
        user_id = current_user["user_id"]

        if not check_quota(user_id):
            raise HTTPException(
                status_code=429,
                detail="Email quota exceeded. Please upgrade your plan."
            )

        task = process_email_background_task.delay(
            user_id,
            {
                "sender_email": email_request.sender_email,
                "subject": email_request.subject,
                "body": email_request.body,
            }
        )

        return {"status": "queued", "task_id": task.id}

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
        gmail = GmailService(user_id=current_user["user_id"])
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
        incoming_history_id = str(notification_data["history_id"])
        receiving_email = notification_data.get("email_address")

        from services.gmail_oauth_service import get_user_by_email
        resolved_user_id = get_user_by_email(receiving_email) if receiving_email else None
        user_id = resolved_user_id or "system"

        # 0. In-Memory Debounce (Prevents Race Conditions)
        if _is_recently_seen(f"{user_id}:{incoming_history_id}", RECENT_HISTORY_IDS, ttl=60):
            # Return silently without logging to avoid log spam during webhook bursts
            return {"status": "ignored", "reason": "debounced_in_memory"}
            
        logger.info("Gmail push received for history_id=%s", incoming_history_id)

        last_history_id = get_last_history_id(user_id)

        # 1. Strict History ID Tracking (Webhook Debounce)
        try:
            if int(incoming_history_id) <= int(last_history_id):
                logger.info("Ignoring duplicate/old push. Incoming: %s, Stored: %s", incoming_history_id, last_history_id)
                return {"status": "ignored", "reason": "old_notification"}
        except ValueError:
            pass  # Fallback if history_id is somehow not numeric

        gmail = GmailService(user_id=resolved_user_id)
        # Use stored history ID instead of notification history ID
        message_data = gmail.fetch_latest_message_since(last_history_id)

        # Update stored history ID to move the cursor forward
        update_last_history_id(incoming_history_id, user_id)

        if message_data.get("status") in ("failed", "no_new_messages"):
            logger.info("Skipping push — reason: %s", message_data.get("error"))
            return {
                "status": "ignored",
                "reason": message_data.get("error"),
            }

        sender_lower = message_data.get("sender_email", "").lower()
        
        # Skip emails sent by the system itself
        current_sender_email = (gmail.sender_email or settings.GMAIL_SENDER_EMAIL).lower()
        if sender_lower == current_sender_email:
            logger.info("Skipping outbound email from self")
            return {"status": "ignored", "reason": "outbound_email"}
            
        # Skip bounce and auto-reply emails
        if sender_lower.startswith("mailer-daemon@") or sender_lower.startswith("postmaster@") or "noreply@" in sender_lower or "no-reply@" in sender_lower:
            logger.info("Skipping automated/bounce email from %s", sender_lower)
            return {"status": "ignored", "reason": "automated_email"}

        message_id = message_data.get("message_id")
        idempotency_key = f"{user_id}:{message_id}"

        # 2. In-Memory Idempotency Debounce (Saves Supabase DB Calls)
        if message_id and _is_recently_seen(idempotency_key, RECENT_MESSAGE_IDS, ttl=300):
            logger.info("Debounced duplicate message in memory: %s", idempotency_key)
            return {"status": "ignored", "reason": "duplicate_message_in_memory"}

        # 3. GLOBAL MESSAGE DEDUP PIPELINE (Atomic Database Lock)
        if not acquire_idempotency_lock(idempotency_key, user_id, message_id):
            logger.info("Idempotency lock already held. Skipping duplicate message: %s", idempotency_key)
            return {"status": "ignored", "reason": "duplicate"}
        
        process_email_background_task.delay(
            resolved_user_id,
            {
                "sender_email": message_data["sender_email"],
                "subject": message_data["subject"],
                "body": message_data["body"],
                "gmail_message_id": message_data.get("message_id"),
                "idempotency_key": idempotency_key,
            }
        )

        return {
            "status": "queued",
            "message_id": message_id
        }

    except ValueError as exc:
        logger.error("Push failed — invalid payload: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail=str(exc))

    except HTTPException:
        raise

    except Exception as exc:
        logger.error("GMAIL PUSH FAILED: %s", exc, exc_info=True)
        # If we acquired the lock but the pipeline crashed, mark it as failed for safe retries
        if 'idempotency_key' in locals():
            mark_as_processed(idempotency_key=idempotency_key, status="failed")
        return {"status": "error", "detail": str(exc)}


@router.get("/subscription/status")
def subscription_status(
    current_user: dict = Depends(get_current_user),
) -> dict:
    from services.subscription_service import get_subscription_info
    user_id = current_user["user_id"]
    return get_subscription_info(user_id)