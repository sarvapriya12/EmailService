import logging
from typing import Optional
from supabase import Client
from services.database import get_supabase

logger = logging.getLogger(__name__)


def sign_up(email: str, password: str) -> dict:
    try:
        client = get_supabase()
        response = client.auth.sign_up({"email": email, "password": password})
        return {"status": "success", "user": response.user.email if response.user else None}
    except Exception as exc:
        logger.error("Sign up failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def sign_in(email: str, password: str) -> dict:
    try:
        client = get_supabase()
        response = client.auth.sign_in_with_password({"email": email, "password": password})
        return {
            "status": "success",
            "access_token": response.session.access_token,
            "token_type": "bearer",
        }
    except Exception as exc:
        logger.error("Sign in failed: %s", exc)
        return {"status": "failed", "error": str(exc)}