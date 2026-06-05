import logging
from services.database import _get_client
from services.gmail_service import GmailService

logger = logging.getLogger(__name__)


def queue_reply(
    ticket_id: str,
    sender_email: str,
    reply_subject: str,
    reply_body: str,
) -> dict:
    try:
        response = _get_client().table("approval_queue").insert({
            "ticket_id": ticket_id,
            "sender_email": sender_email,
            "reply_subject": reply_subject,
            "original_reply_body": reply_body,
            "status": "pending",
        }).execute()
        return {"status": "queued", "item": response.data[0] if response.data else {}}
    except Exception as exc:
        logger.error("queue_reply failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def get_pending(user_id: str) -> list:
    try:
        # Get all tickets belonging to this user
        tickets_response = _get_client().table("tickets").select("id").eq(
            "user_id", user_id
        ).execute()

        if not tickets_response.data:
            return []

        ticket_ids = [t["id"] for t in tickets_response.data]

        response = _get_client().table("approval_queue").select(
            "id, ticket_id, sender_email, reply_subject, original_reply_body, edited_reply_body, status, created_at"
        ).in_("ticket_id", ticket_ids).eq(
            "status", "pending"
        ).order("created_at").execute()

        return response.data or []
    except Exception as exc:
        logger.error("get_pending failed: %s", exc)
        return []


def approve(queue_id: str) -> dict:
    try:
        item_response = _get_client().table("approval_queue").select(
            "sender_email, reply_subject, original_reply_body"
        ).eq("id", queue_id).execute()

        if not item_response.data:
            return {"status": "failed", "error": "Queue item not found"}

        item = item_response.data[0]
        gmail = GmailService()
        send_result = gmail.send_reply(
            to_email=item["sender_email"],
            subject=item["reply_subject"],
            body=item["original_reply_body"],
        )

        _get_client().table("approval_queue").update({
            "status": "approved",
            "acted_at": "now()",
        }).eq("id", queue_id).execute()

        return {"status": "approved", "gmail_status": send_result.get("status")}

    except Exception as exc:
        logger.error("approve failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def reject(queue_id: str) -> dict:
    try:
        _get_client().table("approval_queue").update({
            "status": "rejected",
            "acted_at": "now()",
        }).eq("id", queue_id).execute()
        return {"status": "rejected"}
    except Exception as exc:
        logger.error("reject failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def edit_and_send(queue_id: str, edited_body: str) -> dict:
    try:
        item_response = _get_client().table("approval_queue").select(
            "sender_email, reply_subject"
        ).eq("id", queue_id).execute()

        if not item_response.data:
            return {"status": "failed", "error": "Queue item not found"}

        item = item_response.data[0]
        gmail = GmailService()
        send_result = gmail.send_reply(
            to_email=item["sender_email"],
            subject=item["reply_subject"],
            body=edited_body,
        )

        _get_client().table("approval_queue").update({
            "status": "edited_and_sent",
            "edited_reply_body": edited_body,
            "acted_at": "now()",
        }).eq("id", queue_id).execute()

        return {"status": "edited_and_sent", "gmail_status": send_result.get("status")}

    except Exception as exc:
        logger.error("edit_and_send failed: %s", exc)
        return {"status": "failed", "error": str(exc)}