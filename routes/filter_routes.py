import logging
from fastapi import APIRouter, Depends, HTTPException
from services.auth_guard import get_current_user
from services.filter_service import add_filter, remove_filter, get_filters

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/filters", tags=["filters"])


@router.get("")
def list_filters(current_user: dict = Depends(get_current_user)) -> list:
    return get_filters(user_id=current_user["user_id"])


@router.post("")
def create_filter(
    body: dict,
    current_user: dict = Depends(get_current_user),
) -> dict:
    filter_type = body.get("type")
    pattern = body.get("pattern")

    if filter_type not in ("whitelist", "blacklist"):
        raise HTTPException(status_code=400, detail="Type must be whitelist or blacklist")
    if not pattern:
        raise HTTPException(status_code=400, detail="Pattern is required")

    return add_filter(
        user_id=current_user["user_id"],
        filter_type=filter_type,
        pattern=pattern,
    )


@router.delete("/{filter_id}")
def delete_filter(
    filter_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    return remove_filter(filter_id=filter_id)