import logging
from fastapi import APIRouter, Depends, HTTPException
from services.auth_guard import get_current_user
from services.approval_service import get_pending, approve, reject, edit_and_send

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("")
def list_pending(current_user: dict = Depends(get_current_user)) -> list:
    return get_pending(user_id=current_user["user_id"])


@router.post("/{queue_id}/approve")
def approve_reply(
    queue_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    return approve(queue_id=queue_id)


@router.post("/{queue_id}/reject")
def reject_reply(
    queue_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    return reject(queue_id=queue_id)


@router.post("/{queue_id}/edit")
def edit_reply(
    queue_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
) -> dict:
    edited_body = body.get("body")
    if not edited_body:
        raise HTTPException(status_code=400, detail="Body is required")
    return edit_and_send(queue_id=queue_id, edited_body=edited_body)