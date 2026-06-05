import logging
from services.database import _get_client

logger = logging.getLogger(__name__)


def get_or_create_settings(user_id: str) -> dict:
    try:
        response = _get_client().table("user_settings").select(
            "user_id, review_mode, created_at, updated_at"
        ).eq("user_id", user_id).execute()

        if response.data:
            return response.data[0]

        insert_response = _get_client().table("user_settings").insert({
            "user_id": user_id,
            "review_mode": False,
        }).execute()

        return insert_response.data[0] if insert_response.data else {
            "user_id": user_id,
            "review_mode": False,
        }
    except Exception as exc:
        logger.error("get_or_create_settings failed: %s", exc)
        return {"user_id": user_id, "review_mode": False}


def set_review_mode(user_id: str, enabled: bool) -> dict:
    try:
        settings = get_or_create_settings(user_id)

        _get_client().table("user_settings").update({
            "review_mode": enabled,
            "updated_at": "now()",
        }).eq("user_id", user_id).execute()

        return {"status": "updated", "review_mode": enabled}
    except Exception as exc:
        logger.error("set_review_mode failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def is_review_mode_enabled(user_id: str) -> bool:
    try:
        settings = get_or_create_settings(user_id)
        return bool(settings.get("review_mode", False))
    except Exception as exc:
        logger.error("is_review_mode_enabled failed: %s", exc)
        return False