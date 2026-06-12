import logging
from typing import Any, Dict, List, Optional

from services.database import _get_client

logger = logging.getLogger(__name__)


def get_all_presets() -> List[Dict[str, Any]]:
    """Fetches all system-defined business presets."""
    try:
        response = _get_client().table("business_profile_presets").select("*").execute()
        return response.data or []
    except Exception as exc:
        logger.error("get_all_presets failed: %s", exc)
        return []


def get_preset(type_key: str) -> Optional[Dict[str, Any]]:
    """Fetches a specific system preset by its type_key."""
    try:
        response = _get_client().table("business_profile_presets").select("*").eq("type_key", type_key).execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        logger.error("get_preset failed: %s", exc)
        return None


def get_or_create_profile(user_id: str) -> Dict[str, Any]:
    """Fetches the user's business profile or creates a default 'general' one if it doesn't exist."""
    try:
        supabase = _get_client()
        response = supabase.table("user_business_profiles").select("*").eq("user_id", user_id).execute()
        
        if response.data:
            return response.data[0]
            
        # Create a new profile defaulting to 'general'
        insert_response = supabase.table("user_business_profiles").insert({
            "user_id": user_id,
            "preset_type_key": "general",
            "onboarding_complete": False
        }).execute()
        
        return insert_response.data[0] if insert_response.data else {}
    except Exception as exc:
        logger.error("get_or_create_profile failed: %s", exc)
        return {"user_id": user_id, "preset_type_key": "general"}


def set_business_type(user_id: str, type_key: str) -> Dict[str, Any]:
    """Sets the user's business type and clears any custom overrides to reset to the new preset's defaults."""
    try:
        # Ensure profile exists first
        get_or_create_profile(user_id)
        
        response = _get_client().table("user_business_profiles").update({
            "preset_type_key": type_key,
            "tone_override": None,
            "style_override": None,
            "categories_override": None,
            "updated_at": "now()"
        }).eq("user_id", user_id).execute()
        
        return {"status": "success", "profile": response.data[0] if response.data else {}}
    except Exception as exc:
        logger.error("set_business_type failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def update_tone(user_id: str, tone: str) -> Dict[str, Any]:
    """Updates the user's custom tone override."""
    try:
        response = _get_client().table("user_business_profiles").update({
            "tone_override": tone,
            "updated_at": "now()"
        }).eq("user_id", user_id).execute()
        return {"status": "success", "profile": response.data[0] if response.data else {}}
    except Exception as exc:
        logger.error("update_tone failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def update_style(user_id: str, style: str) -> Dict[str, Any]:
    """Updates the user's custom style override."""
    try:
        response = _get_client().table("user_business_profiles").update({
            "style_override": style,
            "updated_at": "now()"
        }).eq("user_id", user_id).execute()
        return {"status": "success", "profile": response.data[0] if response.data else {}}
    except Exception as exc:
        logger.error("update_style failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def update_categories(user_id: str, categories: List[str]) -> Dict[str, Any]:
    """Updates the user's custom category overrides (Pro+ Feature)."""
    try:
        response = _get_client().table("user_business_profiles").update({
            "categories_override": categories,
            "updated_at": "now()"
        }).eq("user_id", user_id).execute()
        return {"status": "success", "profile": response.data[0] if response.data else {}}
    except Exception as exc:
        logger.error("update_categories failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def complete_onboarding(user_id: str) -> Dict[str, Any]:
    """Marks the user's onboarding phase as complete."""
    try:
        response = _get_client().table("user_business_profiles").update({
            "onboarding_complete": True,
            "updated_at": "now()"
        }).eq("user_id", user_id).execute()
        return {"status": "success", "profile": response.data[0] if response.data else {}}
    except Exception as exc:
        logger.error("complete_onboarding failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def get_active_config(user_id: str) -> Dict[str, Any]:
    """
    Returns the merged configuration for the pipeline.
    It merges the user's custom overrides on top of their selected preset.
    """
    profile = get_or_create_profile(user_id)
    preset_key = profile.get("preset_type_key", "general")
    
    preset = get_preset(preset_key)
    
    # Fallback to absolute defaults if something is critically missing
    if not preset:
        logger.warning(f"Preset '{preset_key}' not found, falling back to safe defaults.")
        return {
            "categories": ["billing", "refund", "technical_support", "complaint", "general_inquiry"],
            "extraction_fields": ["customer_name", "issue", "priority", "reference_number"],
            "tone": "friendly",
            "style": "concise"
        }

    # Merging logic: Use user override if it exists, otherwise fall back to the preset's default.
    active_config = {
        "categories": profile.get("categories_override") or preset.get("categories"),
        "extraction_fields": preset.get("extraction_fields"), # Fields are tied to presets, currently not overridable
        "tone": profile.get("tone_override") or preset.get("default_tone"),
        "style": profile.get("style_override") or preset.get("default_style")
    }
    
    return active_config