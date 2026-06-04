import logging
from supabase import create_client
from config.settings import settings

logger = logging.getLogger(__name__)
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def is_already_processed(gmail_message_id: str) -> bool:
    try:
        response = supabase.table("processed_messages").select("id").eq(
            "gmail_message_id", gmail_message_id
        ).execute()
        return len(response.data) > 0
    except Exception as exc:
        logger.error("is_already_processed failed: %s", exc, exc_info=True)
        return False

def mark_as_processed(
    gmail_message_id: str,
    sender_email: str,
    subject: str,
    status: str,
) -> None:
    try:
        supabase.table("processed_messages").insert({
            "gmail_message_id": gmail_message_id,
            "sender_email": sender_email,
            "subject": subject,
            "status": status,
        }).execute()
    except Exception as exc:
        logger.error("mark_as_processed failed: %s", exc, exc_info=True)


def get_last_history_id() -> str:
    try:
        response = supabase.table("gmail_watch_state").select("last_history_id").eq("id", 1).execute()
        if response.data:
            return response.data[0]["last_history_id"]
        return "0"
    except Exception as exc:
        logger.error("get_last_history_id failed: %s", exc)
        return "0"

def update_last_history_id(history_id: str) -> None:
    try:
        supabase.table("gmail_watch_state").update({
            "last_history_id": history_id,
            "updated_at": "now()"
        }).eq("id", 1).execute()
    except Exception as exc:
        logger.error("update_last_history_id failed: %s", exc)