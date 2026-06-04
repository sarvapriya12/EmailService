from supabase import create_client
from config.settings import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def is_already_processed(gmail_message_id: str) -> bool:
    response = supabase.table("processed_messages").select("id").eq(
        "gmail_message_id", gmail_message_id
    ).execute()
    return len(response.data) > 0

def mark_as_processed(
    gmail_message_id: str,
    sender_email: str,
    subject: str,
    status: str,
) -> None:
    supabase.table("processed_messages").insert({
        "gmail_message_id": gmail_message_id,
        "sender_email": sender_email,
        "subject": subject,
        "status": status,
    }).execute()