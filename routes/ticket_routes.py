import logging
from fastapi import APIRouter, Depends, HTTPException
from services.auth_guard import get_current_user
from typing import Optional
from services.ticket_service import (
    get_tickets,
    get_ticket,
    update_ticket_status,
    send_manual_reply,
    generate_ticket_reply,
)
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tickets", tags=["tickets"])


class ReplyRequest(BaseModel):
    body: str


class GenerateReplyRequest(BaseModel):
    instructions: Optional[str] = None


@router.get("")
def list_tickets(current_user: dict = Depends(get_current_user)) -> list:
    return get_tickets(user_id=current_user["user_id"])


@router.get("/{ticket_id}")
def get_single_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    ticket = get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}/status")
def change_ticket_status(
    ticket_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
) -> dict:
    status = body.get("status")
    if status not in ("open", "in_progress", "resolved", "closed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    return update_ticket_status(ticket_id=ticket_id, status=status)


@router.post("/{ticket_id}/reply")
def reply_to_ticket(
    ticket_id: str,
    reply: ReplyRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    result = send_manual_reply(ticket_id=ticket_id, body=reply.body)
    if result.get("status") == "failed":
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to send manual reply")
        )
    return result


@router.post("/{ticket_id}/generate-reply")
def generate_reply_for_ticket(
    ticket_id: str,
    body: Optional[GenerateReplyRequest] = None,
    current_user: dict = Depends(get_current_user),
) -> dict:
    instructions = body.instructions if body else None
    result = generate_ticket_reply(ticket_id=ticket_id, instructions=instructions)
    if result.get("status") == "failed":
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to generate AI reply")
        )
    return result