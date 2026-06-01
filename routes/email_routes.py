from schemas.email import EmailRequest, EmailResponse
from schemas.pubsub import PubSubPushRequest
from services.gmail_service import GmailService
from services.gmail_watch_service import GmailWatchService
from services.email_pipeline_service import EmailPipelineService
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/process-email")
def process_email(email_request: EmailRequest) -> EmailResponse:
    
    try:
        pipeline = EmailPipelineService()
        return pipeline.process_incoming_email(
            sender_email=email_request.sender_email,
            subject=email_request.subject,
            body=email_request.body,
        )


    except RuntimeError:
        raise HTTPException(status_code=503, detail="All LLM providers failed")

    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/gmail/watch")
def watch_gmail() -> dict[str, object]:
    try:
        gmail = GmailService()
        result = gmail.watch_inbox()

        if result.get("status") == "failed":
            raise HTTPException(status_code=503, detail=result.get("error", "Gmail watch failed"))

        return result
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/gmail/push")
def gmail_push(notification: PubSubPushRequest) -> dict[str, object]:
    try:
        listener = GmailWatchService()
        notification_data = listener.parse_notification(notification)

        gmail = GmailService()
        message_data = gmail.fetch_latest_message_since(notification_data["history_id"])

        if message_data.get("status") == "failed":
            raise HTTPException(status_code=503, detail=message_data.get("error", "Failed to fetch Gmail message"))

        pipeline = EmailPipelineService(gmail=gmail)
        processing_result = pipeline.process_incoming_email(
            sender_email=message_data["sender_email"],
            subject=message_data["subject"],
            body=message_data["body"],
        )

        return {
            "notification": notification_data,
            "message": message_data,
            "processing": processing_result.model_dump(),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")