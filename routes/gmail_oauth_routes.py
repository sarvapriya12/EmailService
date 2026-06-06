import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from services.auth_guard import get_current_user
from services.gmail_oauth_service import (
    exchange_code,
    get_oauth_url,
    is_connected,
    revoke_token,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/gmail", tags=["gmail-oauth"])

# This is where the backend will redirect the user after Google login completes.
# For local development with React/Vite, this is usually port 5173.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


@router.get("/connect")
def connect_gmail(current_user: dict = Depends(get_current_user)) -> dict:
    """Returns the Google OAuth consent URL."""
    url = get_oauth_url(user_id=current_user["user_id"])
    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate OAuth URL")
    return {"oauth_url": url}


@router.get("/callback")
def oauth_callback(
    code: str = Query(...), 
    state: str = Query(None),
    error: str = Query(None)
):
    """Google redirects here after the user clicks 'Allow'."""
    if error or not state or not code:
        logger.error("Google OAuth error or missing params: %s", error)
        return RedirectResponse(f"{FRONTEND_URL}/settings?error=oauth_failed")

    user_id = state  # We passed the user_id into the 'state' variable in get_oauth_url
    
    success = exchange_code(user_id=user_id, code=code)
    if success:
        return RedirectResponse(f"{FRONTEND_URL}/settings?gmail_connected=true")
    return RedirectResponse(f"{FRONTEND_URL}/settings?error=exchange_failed")


@router.delete("/disconnect")
def disconnect_gmail(current_user: dict = Depends(get_current_user)) -> dict:
    """Revokes the user's Gmail access and deletes the token."""
    if revoke_token(user_id=current_user["user_id"]):
        return {"status": "success", "message": "Gmail disconnected"}
    raise HTTPException(status_code=500, detail="Failed to disconnect Gmail")


@router.get("/status")
def gmail_status(current_user: dict = Depends(get_current_user)) -> dict:
    """Returns whether the user has connected a Gmail account."""
    return is_connected(user_id=current_user["user_id"])