from schemas.email import EmailRequest, EmailResponse
from schemas.pubsub import PubSubPushRequest
from services.gmail_service import GmailService
from services.gmail_watch_service import GmailWatchService
from services.email_pipeline_service import EmailPipelineService
from fastapi import APIRouter, HTTPException
import logging
from services.database import is_already_processed, mark_as_processed
from services.auth_guard import get_current_user
from fastapi import Depends
from services.subscription_service import check_quota, increment_usage

logger = logging.getLogger(__name__)


router = APIRouter()

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

        pipeline = EmailPipelineService()
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
def watch_gmail(current_user: dict = Depends(get_current_user)) -> dict[str, object]:
    try:
        gmail = GmailService()
        result = gmail.watch_inbox()

        if result.get("status") == "failed":
            raise HTTPException(status_code=503, detail=result.get("error", "Gmail watch failed"))

        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("watch-gmail failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/subscription/status")
def subscription_status(
    current_user: dict = Depends(get_current_user),
) -> dict:
    from services.subscription_service import get_subscription_info
    user_id = current_user["user_id"]
    return get_subscription_info(user_id)

@router.post("/gmail/push")
def gmail_push(notification: PubSubPushRequest) -> dict[str, object]:
    print("GMAIL PUSH HIT", flush=True)  # TEMP
    try:
        logger.warning("PUSH STARTED — notification received")  # TEMP
        listener = GmailWatchService()
        notification_data = listener.parse_notification(notification)
        logger.warning("NOTIFICATION PARSED: %s", notification_data)  # TEMP

        gmail = GmailService()
        message_data = gmail.fetch_latest_message_since(notification_data["history_id"])
        logger.warning("MESSAGE FETCHED: %s", message_data.get("status"))  # TEMP
        if message_data.get("status") in ("failed", "no_new_messages"):
            logger.info("Skipping push — reason: %s", message_data.get("error"))
            return {
                "status": "ignored",
                "reason": message_data.get("error"),
            }

        message_id = message_data.get("message_id")
        logger.info("IDEMPOTENCY CHECK STARTED for message: %s", message_id)  # TEMP

        if is_already_processed(message_id):
            logger.info("Skipping duplicate message: %s", message_id)
            return {"status": "ignored", "reason": "duplicate"}

        logger.info("PIPELINE STARTED")  # TEMP
        pipeline = EmailPipelineService(gmail=gmail)
        processing_result = pipeline.process_incoming_email(
            sender_email=message_data["sender_email"],
            subject=message_data["subject"],
            body=message_data["body"],
        )
        logger.info("PIPELINE COMPLETE — status: %s", processing_result.gmail_status)  # TEMP

        mark_as_processed(
            gmail_message_id=message_id,
            sender_email=message_data["sender_email"],
            subject=message_data["subject"],
            status=processing_result.gmail_status,
        )

        return {
            "notification": notification_data,
            "message": message_data,
            "processing": processing_result.model_dump(),
        }

    except ValueError as exc:
        logger.error("Push failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail=str(exc))

    except HTTPException:
        raise

    except Exception as exc:
        logger.error("GMAIL PUSH FAILED: %s", exc, exc_info=True)
        return {"status": "error", "detail": str(exc)}