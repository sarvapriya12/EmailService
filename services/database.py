import logging
from config.settings import settings

logger = logging.getLogger(__name__)


def _get_client():
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def lock_message_for_processing(gmail_message_id: str, sender_email: str, subject: str) -> bool:
    try:
        _get_client().table("processed_messages").insert({
            "gmail_message_id": gmail_message_id,
            "sender_email": sender_email,
            "subject": subject,
            "status": "processing",
        }).execute()
        return True
    except Exception as exc:
        if "duplicate key value" in str(exc).lower() or "23505" in str(exc):
            return False
        logger.warning("Message %s lock failed or already processing: %s", gmail_message_id, exc)
        return False


def mark_as_processed(
    gmail_message_id: str,
    status: str,
) -> None:
    try:
        _get_client().table("processed_messages").update({
            "status": status,
        }).eq("gmail_message_id", gmail_message_id).execute()
    except Exception as exc:
        logger.error("mark_as_processed failed: %s", exc, exc_info=True)


def get_last_history_id() -> str:
    try:
        response = _get_client().table("gmail_watch_state").select("last_history_id").eq(
            "id", 1
        ).execute()
        if response.data:
            return response.data[0]["last_history_id"]
        return "0"
    except Exception as exc:
        logger.error("get_last_history_id failed: %s", exc)
        return "0"


def update_last_history_id(history_id: str) -> None:
    try:
        _get_client().table("gmail_watch_state").update({
            "last_history_id": history_id,
            "updated_at": "now()"
        }).eq("id", 1).execute()
    except Exception as exc:
        logger.error("update_last_history_id failed: %s", exc)