import logging

from services.database import _get_client

logger = logging.getLogger(__name__)


def sign_up(email: str, password: str) -> dict:
    try:
        supabase = _get_client()
        response = supabase.auth.sign_up({"email": email, "password": password})
        return {"status": "success", "user": response.user.email if response.user else None}
    except Exception as exc:
        logger.error("Sign up failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def sign_in(email: str, password: str) -> dict:
    try:
        supabase = _get_client()
        response = supabase.auth.sign_in_with_password({"email": email, "password": password})
        return {
            "status": "success",
            "access_token": response.session.access_token,
            "token_type": "bearer",
        }
    except Exception as exc:
        logger.error("Sign in failed: %s", exc)
        return {"status": "failed", "error": str(exc)}