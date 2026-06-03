from supabase import create_client, Client
from config.settings import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def is_already_processed(gmail_message_id: str) -> bool:
    """It queries the processed_emails table, filters where message_id 
    equals message_id, and returns True if a result exists, False if not."""
    
    response = supabase.table("processed_messages").select("*").eq("gmail_message_id", gmail_message_id).execute()
    return len(response.data) > 0

def mark_as_processed(gmail_message_id: str, sender_email: str, subject: str, status: str) -> None:
    """It inserts a new record into the processed_emails table
      with the given message_id, sender_email, subject, and status."""
    
    supabase.table("processed_messages").insert({
        "gmail_message_id": gmail_message_id,
        "sender_email": sender_email,
        "subject": subject,
        "status": status
    }).execute()
