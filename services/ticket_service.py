import logging
from services.database import _get_client

logger = logging.getLogger(__name__)


def get_or_create_ticket(sender_email: str, subject: str, user_id: str, category: str | None = None) -> dict:
    try:
        # Check for existing open ticket from this sender
        response = _get_client().table("tickets").select(
            "id, status, subject, category, created_at"
        ).eq("sender_email", sender_email).eq(
            "user_id", user_id
        ).in_("status", ["open", "in_progress"]).execute()

        if response.data:
            ticket = response.data[0]
            # Update category if it was missing and we have one now
            if category and not ticket.get("category"):
                _get_client().table("tickets").update(
                    {"category": category}
                ).eq("id", ticket["id"]).execute()
                ticket["category"] = category
            return {"ticket": ticket, "created": False}

        # Create new ticket
        insert_data = {
            "user_id": user_id,
            "sender_email": sender_email,
            "subject": subject,
            "status": "open",
        }
        if category:
            insert_data["category"] = category

        insert_response = _get_client().table("tickets").insert(insert_data).execute()

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
            "id, sender_email, subject, status, category, resolution, created_at, resolved_at"
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
        messages = messages_response.data or []

        # Query approval_queue for all entries for this ticket
        try:
            queue_response = _get_client().table("approval_queue").select(
                "id, reply_subject, original_reply_body, edited_reply_body, status, created_at, acted_at"
            ).eq("ticket_id", ticket_id).execute()
            
            queue_items = queue_response.data or []
            
            # Find any pending reply
            pending_reply = next((q for q in queue_items if q["status"] == "pending"), None)
            ticket["pending_reply"] = pending_reply
            
            # Find approved or edited_and_sent replies to backfill outbound messages
            # only if there isn't already an outbound message in `ticket_messages`
            has_outbound = any(m["direction"] == "outbound" for m in messages)
            
            if not has_outbound:
                for q in queue_items:
                    if q["status"] in ("approved", "edited_and_sent"):
                        body = q["edited_reply_body"] if q["status"] == "edited_and_sent" else q["original_reply_body"]
                        messages.append({
                            "id": q["id"],
                            "direction": "outbound",
                            "body": body,
                            "gmail_message_id": None,
                            "created_at": q["acted_at"] or q["created_at"]
                        })
            
            # Sort messages chronologically
            messages.sort(key=lambda m: m.get("created_at") or "")
            
        except Exception as q_exc:
            logger.warning("Failed to check approval queue for ticket %s: %s", ticket_id, q_exc)
            ticket["pending_reply"] = None

        ticket["messages"] = messages
        return ticket

    except Exception as exc:
        logger.error("get_ticket failed: %s", exc)
        return None


def update_ticket_status(ticket_id: str, status: str, resolution: str | None = None) -> dict:
    try:
        update_data: dict = {"status": status}

        if resolution:
            update_data["resolution"] = resolution

        if status in ("resolved", "closed"):
            update_data["resolved_at"] = "now()"

        _get_client().table("tickets").update(update_data).eq(
            "id", ticket_id
        ).execute()

        return {"status": "updated"}
    except Exception as exc:
        logger.error("update_ticket_status failed: %s", exc)
        return {"status": "failed", "error": str(exc)}