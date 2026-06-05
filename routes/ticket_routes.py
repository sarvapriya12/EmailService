import logging
from fastapi import APIRouter, Depends, HTTPException
from services.auth_guard import get_current_user
from services.ticket_service import get_tickets, get_ticket, update_ticket_status

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tickets", tags=["tickets"])


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