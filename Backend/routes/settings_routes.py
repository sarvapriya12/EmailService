import logging
from fastapi import APIRouter, Depends
from services.auth_guard import get_current_user
from services.settings_service import get_or_create_settings, set_review_mode

from services.subscription_service import get_or_create_subscription

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(current_user: dict = Depends(get_current_user)) -> dict:
    settings = get_or_create_settings(user_id=current_user["user_id"])
    sub = get_or_create_subscription(user_id=current_user["user_id"])
    settings["tier"] = sub.get("tier", "free")
    settings["emails_used"] = sub.get("emails_used", 0)
    settings["emails_limit"] = sub.get("emails_limit", 50)
    return settings


@router.patch("/review-mode")
def toggle_review_mode(
    body: dict,
    current_user: dict = Depends(get_current_user),
) -> dict:
    enabled = body.get("enabled")
    if not isinstance(enabled, bool):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="enabled must be a boolean")
    return set_review_mode(user_id=current_user["user_id"], enabled=enabled)