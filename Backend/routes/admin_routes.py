import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.auth_guard import get_current_user
from services.admin_service import (
    check_is_admin,
    get_system_stats,
    get_all_users,
    manual_upgrade_user
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


class UpgradeRequest(BaseModel):
    tier: str
    new_limit: int


def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency to ensure the current user is a super admin."""
    if not check_is_admin(current_user["user_id"]):
        logger.warning("Unauthorized admin access attempt by %s", current_user["user_id"])
        raise HTTPException(status_code=403, detail="Super Admin privileges required")
    return current_user


@router.get("/stats")
def system_stats(_: dict = Depends(verify_admin)) -> dict:
    """Get master metrics for the entire application."""
    return get_system_stats()


@router.get("/users")
def list_users(_: dict = Depends(verify_admin)) -> list:
    """List all users, their usage, and Gmail connections."""
    return get_all_users()


@router.post("/users/{target_user_id}/upgrade")
def upgrade_user(
    target_user_id: str,
    body: UpgradeRequest,
    _: dict = Depends(verify_admin)
) -> dict:
    """Manually grant a user a higher tier."""
    return manual_upgrade_user(user_id=target_user_id, tier=body.tier, new_limit=body.new_limit)