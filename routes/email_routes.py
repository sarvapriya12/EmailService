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


# Simple in-memory debounce function to prevent processing the
#  same history_id or message_id multiple times within a short window.
def _is_recently_seen(id_str: str, cache: dict[str, float], ttl: int = 60) -> bool:
    now = time.time()

    # Use a lock to ensure thread safety when accessing the cache
    # This is important because FastAPI can run multiple requests in parallel,
    #  and we want to avoid race conditions when checking and updating the cache.
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
        # Fetch all messages since the last history ID
        messages = gmail.fetch_messages_since(last_history_id)

        # Update stored history ID to move the cursor forward
        update_last_history_id(incoming_history_id, user_id)

        if not messages:
            logger.info("Skipping push — reason: No new messages found")
            return {
                "status": "ignored",
                "reason": "No new messages found",
            }

        queued_ids = []
        ignored_messages = []
        current_sender_email = (gmail.sender_email or settings.GMAIL_SENDER_EMAIL).lower()

        for msg in messages:
            message_id = msg.get("message_id")
            if not message_id:
                continue

            sender_lower = msg.get("sender_email", "").lower()

            # Skip emails sent by the system itself
            if sender_lower == current_sender_email:
                logger.info("Skipping outbound email from self: %s", message_id)
                ignored_messages.append({"message_id": message_id, "reason": "outbound_email"})
                continue

            # Skip bounce and auto-reply emails
            if sender_lower.startswith("mailer-daemon@") or sender_lower.startswith("postmaster@") or "noreply@" in sender_lower or "no-reply@" in sender_lower:
                logger.info("Skipping automated/bounce email from %s for message: %s", sender_lower, message_id)
                ignored_messages.append({"message_id": message_id, "reason": "automated_email"})
                continue

            idempotency_key = f"{user_id}:{message_id}"

            # 2. In-Memory Idempotency Debounce (Saves Supabase DB Calls)
            if _is_recently_seen(idempotency_key, RECENT_MESSAGE_IDS, ttl=300):
                logger.info("Debounced duplicate message in memory: %s", idempotency_key)
                ignored_messages.append({"message_id": message_id, "reason": "duplicate_message_in_memory"})
                continue

            # 3. GLOBAL MESSAGE DEDUP PIPELINE (Atomic Database Lock)
            if not acquire_idempotency_lock(idempotency_key, user_id, message_id):
                logger.info("Idempotency lock already held. Skipping duplicate message: %s", idempotency_key)
                ignored_messages.append({"message_id": message_id, "reason": "duplicate"})
                continue

            try:
                process_email_background_task.delay(
                    resolved_user_id,
                    {
                        "sender_email": msg["sender_email"],
                        "subject": msg["subject"],
                        "body": msg["body"],
                        "gmail_message_id": message_id,
                        "idempotency_key": idempotency_key,
                    }
                )
                queued_ids.append(message_id)
            except Exception as exc:
                logger.error("Failed to queue background task for message %s: %s", message_id, exc)
                # If we acquired the lock but the pipeline failed to queue, mark it as failed for safe retries
                mark_as_processed(idempotency_key=idempotency_key, status="failed")
                ignored_messages.append({"message_id": message_id, "reason": f"queue_failed: {exc}"})

        if not queued_ids:
            reasons = ", ".join(set(item["reason"] for item in ignored_messages))
            return {
                "status": "ignored",
                "reason": f"All messages skipped: {reasons}" if reasons else "No messages to process",
                "details": ignored_messages,
            }

        return {
            "status": "queued",
            "message_ids": queued_ids,
            "ignored_messages": ignored_messages,
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


from pydantic import BaseModel

class SubscriptionUpgradeRequest(BaseModel):
    tier: str

@router.post("/subscription/upgrade")
def upgrade_user_subscription(
    body: SubscriptionUpgradeRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    from services.subscription_service import upgrade_subscription
    user_id = current_user["user_id"]
    return upgrade_subscription(user_id, body.tier)


class SendEmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str

@router.post("/send-email")
def send_email(
    req: SendEmailRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        user_id = current_user["user_id"]

        if not check_quota(user_id):
            raise HTTPException(
                status_code=429,
                detail="Email quota exceeded. Please upgrade your plan."
            )

        gmail = GmailService(user_id=user_id)
        result = gmail.send_reply(
            to_email=req.to_email,
            subject=req.subject,
            body=req.body,
        )

        if result.get("status") == "failed":
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to send email")
            )

        increment_usage(user_id)

        from services.ticket_service import get_or_create_ticket, add_message, update_ticket_status
        ticket_res = get_or_create_ticket(
            sender_email=req.to_email,
            subject=req.subject,
            user_id=user_id,
            category="outbound_composed"
        )
        ticket = ticket_res.get("ticket")
        if ticket and ticket.get("id"):
            ticket_id = ticket["id"]
            add_message(
                ticket_id=ticket_id,
                direction="outbound",
                body=req.body,
            )
            update_ticket_status(ticket_id, "resolved", resolution="manual_reply")

        return {"status": "sent", "to_email": req.to_email}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("send_email failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


class GenerateComposedRequest(BaseModel):
    subject: str
    instructions: str
    to_email: str | None = None

@router.post("/generate-composed")
def generate_composed(
    req: GenerateComposedRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        user_id = current_user["user_id"]
        from services.business_service import get_active_config
        config = get_active_config(user_id)
        tone = config.get("tone", "friendly")
        style = config.get("style", "concise")

        prompt = (
            f"You are a professional customer support assistant. Write a new outbound email to a customer.\n"
            f"Recipient Email: {req.to_email or 'customer'}\n"
            f"Subject: {req.subject}\n"
            f"Instructions on what to say: {req.instructions}\n"
            f"Tone: {tone}\n"
            f"Style: {style}\n\n"
            f"Please write a complete, polite, and professional email body. Do not include placeholders like [Your Name] if you can avoid it; just sign off professionally."
        )

        from services.llm_router import build_generate_pool
        llm_pool = build_generate_pool()
        response = llm_pool.invoke(prompt)

        return {"status": "success", "body": response.strip()}
    except Exception as exc:
        logger.error("generate_composed failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate email body using AI")