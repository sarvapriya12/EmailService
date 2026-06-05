import logging
from services.database import _get_client

logger = logging.getLogger(__name__)


def get_or_create_ticket(sender_email: str, subject: str, user_id: str) -> dict:
    try:
        # Check for existing open ticket from this sender
        response = _get_client().table("tickets").select(
            "id, status, subject, created_at"
        ).eq("sender_email", sender_email).eq(
            "user_id", user_id
        ).in_("status", ["open", "in_progress"]).execute()

        if response.data:
            return {"ticket": response.data[0], "created": False}

        # Create new ticket
        insert_response = _get_client().table("tickets").insert({
            "user_id": user_id,
            "sender_email": sender_email,
            "subject": subject,
            "status": "open",
        }).execute()

        return {"ticket": insert_response.data[0], "created": True}

    except Exception as exc:
        logger.error("get_or_create_ticket failed: %s", exc)
        return {"ticket": None, "created": False}


def add_message(
    ticket_id: str,
    direction: str,
    body: str,
    gmail_message_id: str | None = None,
) -> dict:
    try:
        response = _get_client().table("ticket_messages").insert({
            "ticket_id": ticket_id,
            "direction": direction,
            "body": body,
            "gmail_message_id": gmail_message_id,
        }).execute()
        return {"status": "created", "message": response.data[0] if response.data else {}}
    except Exception as exc:
        logger.error("add_message failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def get_tickets(user_id: str) -> list:
    try:
        response = _get_client().table("tickets").select(
            "id, sender_email, subject, status, created_at, resolved_at"
        ).eq("user_id", user_id).order("created_at", desc=True).execute()
        return response.data or []
    except Exception as exc:
        logger.error("get_tickets failed: %s", exc)
        return []


def get_ticket(ticket_id: str) -> dict | None:
    try:
        ticket_response = _get_client().table("tickets").select(
            "id, sender_email, subject, status, created_at, resolved_at"
        ).eq("id", ticket_id).execute()

        if not ticket_response.data:
            return None

        messages_response = _get_client().table("ticket_messages").select(
            "id, direction, body, gmail_message_id, created_at"
        ).eq("ticket_id", ticket_id).order("created_at").execute()

        ticket = ticket_response.data[0]
        ticket["messages"] = messages_response.data or []
        return ticket

    except Exception as exc:
        logger.error("get_ticket failed: %s", exc)
        return None


def update_ticket_status(ticket_id: str, status: str) -> dict:
    try:
        update_data: dict = {"status": status}

        if status in ("resolved", "closed"):
            update_data["resolved_at"] = "now()"

        _get_client().table("tickets").update(update_data).eq(
            "id", ticket_id
        ).execute()

        return {"status": "updated"}
    except Exception as exc:
        logger.error("update_ticket_status failed: %s", exc)
        return {"status": "failed", "error": str(exc)}