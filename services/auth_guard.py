import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from config.settings import settings

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()

# Dedicated anon client for auth operations (get_user requires anon key, not service role key)
_anon_supabase: Optional[Client] = None


def _get_anon_supabase() -> Client:
    global _anon_supabase
    if _anon_supabase is None:
        _anon_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _anon_supabase


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    token = credentials.credentials
    try:
        response = _get_anon_supabase().auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"user_id": response.user.id, "email": response.user.email}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Auth guard failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
