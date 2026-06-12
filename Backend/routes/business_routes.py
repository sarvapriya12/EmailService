import logging
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from services.auth_guard import get_current_user
from services.business_service import (
    complete_onboarding,
    get_all_presets,
    get_or_create_profile,
    set_business_type,
    update_categories,
    update_style,
    update_tone,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/business", tags=["business"])


class BusinessTypeRequest(BaseModel):
    type_key: str


class ToneRequest(BaseModel):
    tone: str


class StyleRequest(BaseModel):
    style: str


class CategoriesRequest(BaseModel):
    categories: List[str]


@router.get("/presets")
def list_presets() -> list:
    """List all system-defined business presets."""
    return get_all_presets()


@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)) -> dict:
    """Get the current user's business profile."""
    return get_or_create_profile(user_id=current_user["user_id"])


@router.post("/profile/type")
def update_business_type(
    body: BusinessTypeRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Sets the user's business type, resetting custom overrides."""
    return set_business_type(user_id=current_user["user_id"], type_key=body.type_key)


@router.patch("/profile/tone")
def update_profile_tone(
    body: ToneRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Updates the user's custom tone preference."""
    return update_tone(user_id=current_user["user_id"], tone=body.tone)


@router.patch("/profile/style")
def update_profile_style(
    body: StyleRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Updates the user's custom style preference."""
    return update_style(user_id=current_user["user_id"], style=body.style)


@router.patch("/profile/categories")
def update_profile_categories(
    body: CategoriesRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Updates the user's custom categories (Pro+ feature)."""
    return update_categories(user_id=current_user["user_id"], categories=body.categories)


@router.post("/profile/complete-onboarding")
def complete_user_onboarding(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Marks the user's onboarding phase as complete."""
    return complete_onboarding(user_id=current_user["user_id"])