import logging
from celery_app import celery_app
from services.email_pipeline_service import EmailPipelineService
from services.database import mark_as_processed
from services.subscription_service import increment_usage

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def process_email_background_task(self, user_id: str, payload: dict):
    """
    Background task to process emails via the LLM pipeline.
    If it fails (e.g., temporary API outage), it will automatically retry up to 3 times.
    """
    try:
        logger.info("Starting background email processing for user: %s", user_id)
        
        pipeline = EmailPipelineService(user_id=user_id)
        processing_result = pipeline.process_incoming_email(
            sender_email=payload.get("sender_email"),
            subject=payload.get("subject"),
            body=payload.get("body"),
            gmail_message_id=payload.get("gmail_message_id"),
        )

        # If an idempotency key was passed (from webhook), mark it done
        idempotency_key = payload.get("idempotency_key")
        if idempotency_key:
            mark_as_processed(
                idempotency_key=idempotency_key,
                status="done" if processing_result.success else "filtered",
            )
            
        increment_usage(user_id)
        
        return {"status": "success", "user_id": user_id}
    except Exception as e:
        logger.error("Background task failed: %s", e)
        # Exponential backoff: retry in 1 min, then 2 mins, then 4 mins...
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
