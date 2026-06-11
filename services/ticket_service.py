import logging
from services.database import _get_client

logger = logging.getLogger(__name__)


def parse_utc_datetime(dt_str: str):
    if not dt_str:
        return None
    try:
        from datetime import datetime, timezone
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception as e:
        logger.warning("Failed to parse datetime %s: %s", dt_str, e)
        return None


def normalize_subject(subj: str) -> str:
    if not subj:
        return ""
    subj = subj.strip()
    # Strip common prefixes case-insensitively
    lower = subj.lower()
    while lower.startswith("re:") or lower.startswith("fwd:") or lower.startswith("fw:") or lower.startswith("re :") or lower.startswith("fwd :") or lower.startswith("fw :"):
        if lower.startswith("re:"):
            subj = subj[3:]
        elif lower.startswith("fwd:"):
            subj = subj[4:]
        elif lower.startswith("fw:"):
            subj = subj[3:]
        elif lower.startswith("re :"):
            subj = subj[4:]
        elif lower.startswith("fwd :"):
            subj = subj[5:]
        elif lower.startswith("fw :"):
            subj = subj[4:]
        subj = subj.strip()
        lower = subj.lower()
    return subj


def get_or_create_ticket(sender_email: str, subject: str, user_id: str, category: str | None = None) -> dict:
    try:
        # Check for any ticket from this sender
        response = _get_client().table("tickets").select(
            "id, status, subject, category, created_at"
        ).eq("sender_email", sender_email).eq(
            "user_id", user_id
        ).execute()

        # Try to find a matching ticket using normalized subjects
        target_normalized = normalize_subject(subject).lower()
        matched_ticket = None

        # 1. First search for open or in_progress tickets (higher priority to keep them grouped there)
        for ticket in response.data or []:
            if ticket["status"] in ("open", "in_progress"):
                if normalize_subject(ticket.get("subject", "")).lower() == target_normalized:
                    matched_ticket = ticket
                    break

        # 2. If no open/in-progress ticket found, search for resolved/closed tickets to reopen
        if not matched_ticket:
            for ticket in response.data or []:
                if ticket["status"] in ("resolved", "closed"):
                    if normalize_subject(ticket.get("subject", "")).lower() == target_normalized:
                        matched_ticket = ticket
                        # Reopen the ticket
                        _get_client().table("tickets").update({
                            "status": "open",
                            "resolved_at": None,
                            "resolution": None
                        }).eq("id", ticket["id"]).execute()
                        matched_ticket["status"] = "open"
                        break

        if matched_ticket:
            # Update category if it was missing and we have one now
            if category and not matched_ticket.get("category"):
                _get_client().table("tickets").update(
                    {"category": category}
                ).eq("id", matched_ticket["id"]).execute()
                matched_ticket["category"] = category
            return {"ticket": matched_ticket, "created": False}

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
            "id, user_id, sender_email, subject, status, created_at, resolved_at"
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

        # Check for previous ticket from this sender within 24 hours of current ticket's created_at
        current_created_at_str = ticket.get("created_at")
        if current_created_at_str:
            from datetime import timedelta
            try:
                current_created_at = parse_utc_datetime(current_created_at_str)
                
                # Query all tickets from this sender
                prev_tickets_res = _get_client().table("tickets").select(
                    "id, subject, status, created_at"
                ).eq("sender_email", ticket["sender_email"]).eq(
                    "user_id", ticket["user_id"]
                ).neq("id", ticket_id).order("created_at", desc=True).execute()
                
                for prev_t in prev_tickets_res.data or []:
                    prev_created_at_str = prev_t.get("created_at")
                    if prev_created_at_str:
                        prev_created_at = parse_utc_datetime(prev_created_at_str)
                        if current_created_at and prev_created_at:
                            time_diff = current_created_at - prev_created_at
                            if timedelta(seconds=0) < time_diff <= timedelta(hours=24):
                                # Fetch the messages of that previous ticket
                                prev_msgs_res = _get_client().table("ticket_messages").select(
                                    "id, direction, body, gmail_message_id, created_at"
                                ).eq("ticket_id", prev_t["id"]).order("created_at").execute()
                                
                                prev_t["messages"] = prev_msgs_res.data or []
                                ticket["previous_ticket"] = prev_t
                                break
            except Exception as parse_exc:
                logger.warning("Failed to check for previous ticket: %s", parse_exc)

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


def send_manual_reply(ticket_id: str, body: str) -> dict:
    try:
        # Fetch ticket
        ticket_res = _get_client().table("tickets").select(
            "user_id, sender_email, subject"
        ).eq("id", ticket_id).execute()

        if not ticket_res.data:
            return {"status": "failed", "error": "Ticket not found"}

        ticket = ticket_res.data[0]
        user_id = ticket["user_id"]
        sender_email = ticket["sender_email"]
        subject = ticket["subject"]

        # Ensure subject starts with "Re:" if not already
        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"

        # Send via Gmail
        from services.gmail_service import GmailService
        gmail = GmailService(user_id=user_id)
        send_result = gmail.send_reply(
            to_email=sender_email,
            subject=subject,
            body=body,
        )

        if send_result.get("status") == "sent":
            # Add message to history
            add_message(
                ticket_id=ticket_id,
                direction="outbound",
                body=body,
            )
            # Resolve ticket
            update_ticket_status(ticket_id, "resolved", resolution="manual_reply")

        return {"status": "sent", "gmail_status": send_result.get("status")}
    except Exception as exc:
        logger.error("send_manual_reply failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def generate_ticket_reply(ticket_id: str, instructions: str | None = None) -> dict:
    try:
        # Get ticket with messages
        ticket = get_ticket(ticket_id)
        if not ticket:
            return {"status": "failed", "error": "Ticket not found"}

        messages = ticket.get("messages", [])
        if not messages:
            return {"status": "failed", "error": "No messages found in ticket history"}

        # Build thread context for prompt
        conversation = []
        for msg in messages:
            sender_label = "Customer" if msg["direction"] == "inbound" else "Support"
            conversation.append(f"{sender_label}: {msg['body']}")

        history_str = "\n\n".join(conversation)

        # Build prompt
        prompt = (
            "You are a helpful customer support assistant. Write a polite, professional reply to the customer's latest email "
            "based on the following thread history. Do not invent details. Keep the tone professional, helpful, and concise.\n\n"
            "Thread History:\n"
            f"{history_str}\n\n"
        )

        if instructions and instructions.strip():
            prompt += (
                "IMPORTANT: The support agent has provided the following specific instructions or bullet points for the reply. "
                "You MUST incorporate this information/guidance into your response:\n"
                f"Instructions: {instructions.strip()}\n\n"
            )

        prompt += "Reply:"

        from services.llm_router import build_generate_pool
        router = build_generate_pool()
        response = router.invoke(prompt)

        return {
            "status": "success",
            "reply_body": response.strip()
        }
    except Exception as exc:
        logger.error("generate_ticket_reply failed: %s", exc)
        return {"status": "failed", "error": str(exc)}