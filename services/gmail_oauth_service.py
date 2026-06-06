import logging
import os
from typing import Any, Dict, Optional

import requests
from cryptography.fernet import Fernet
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from services.database import _get_client

logger = logging.getLogger(__name__)

# Need a secure encryption key for Fernet. Should be stored in environment variables.
# For Fernet, the key must be a URL-safe base64-encoded 32-byte key.
ENCRYPTION_KEY = os.environ.get("OAUTH_ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    logger.warning("OAUTH_ENCRYPTION_KEY not set. Generating a temporary key. Do not use this in production!")
    ENCRYPTION_KEY = Fernet.generate_key().decode('utf-8')

fernet = Fernet(ENCRYPTION_KEY)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify"
]

CLIENT_CONFIG = {
    "web": {
        "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
        "project_id": os.environ.get("GOOGLE_PROJECT_ID", ""),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", "")
    }
}
REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/gmail/callback")


def encrypt_token(token: str) -> str:
    """Encrypts a token using Fernet."""
    if not token:
        return ""
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypts an encrypted token."""
    if not encrypted_token:
        return ""
    return fernet.decrypt(encrypted_token.encode()).decode()


def get_oauth_url(user_id: str) -> str:
    """Generates Google OAuth consent URL with correct scopes."""
    try:
        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
        
        # We pass user_id as state so we know who the callback is for
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=user_id
        )
        return auth_url
    except Exception as exc:
        logger.error("get_oauth_url failed: %s", exc)
        return ""


def exchange_code(user_id: str, code: str) -> bool:
    """Exchanges auth code for refresh token, encrypts and stores it."""
    try:
        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        if not credentials.refresh_token:
            logger.error("No refresh token returned by Google. User may need to revoke existing access.")
            return False

        service = build('gmail', 'v1', credentials=credentials)
        profile = service.users().getProfile(userId='me').execute()
        sender_email = profile.get('emailAddress')

        encrypted_refresh = encrypt_token(credentials.refresh_token)
        supabase = _get_client()
        
        existing = supabase.table("gmail_oauth_tokens").select("id").eq("user_id", user_id).execute()
        
        token_data = {
            "user_id": user_id,
            "refresh_token": encrypted_refresh,
            "sender_email": sender_email,
            "access_token": credentials.token,
            "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
            "updated_at": "now()"
        }

        if existing.data:
            supabase.table("gmail_oauth_tokens").update(token_data).eq("user_id", user_id).execute()
        else:
            supabase.table("gmail_oauth_tokens").insert(token_data).execute()
            
        return True
    except Exception as exc:
        logger.error("exchange_code failed: %s", exc)
        return False


def get_credentials(user_id: str) -> Optional[Credentials]:
    """Retrieves and decrypts stored token, refreshes if expired."""
    try:
        supabase = _get_client()
        response = supabase.table("gmail_oauth_tokens").select("*").eq("user_id", user_id).execute()
        
        if not response.data:
            return None
            
        token_record = response.data[0]
        decrypted_refresh = decrypt_token(token_record["refresh_token"])
        
        creds = Credentials(
            token=token_record.get("access_token"),
            refresh_token=decrypted_refresh,
            token_uri=CLIENT_CONFIG["web"]["token_uri"],
            client_id=CLIENT_CONFIG["web"]["client_id"],
            client_secret=CLIENT_CONFIG["web"]["client_secret"],
            scopes=SCOPES
        )
        
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            supabase.table("gmail_oauth_tokens").update({
                "access_token": creds.token,
                "token_expiry": creds.expiry.isoformat() if creds.expiry else None,
                "updated_at": "now()"
            }).eq("user_id", user_id).execute()
            
        return creds
    except Exception as exc:
        logger.error("get_credentials failed for user %s: %s", user_id, exc)
        return None


def revoke_token(user_id: str) -> bool:
    """Revokes Google access, deletes from DB."""
    try:
        creds = get_credentials(user_id)
        if creds:
            requests.post('https://oauth2.googleapis.com/revoke',
                          params={'token': creds.token or creds.refresh_token},
                          headers={'content-type': 'application/x-www-form-urlencoded'})
        
        _get_client().table("gmail_oauth_tokens").delete().eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("revoke_token failed: %s", exc)
        return False


def is_connected(user_id: str) -> Dict[str, Any]:
    """Checks if user has a connected Gmail account."""
    try:
        response = _get_client().table("gmail_oauth_tokens").select("sender_email").eq("user_id", user_id).execute()
        if response.data:
            return {"connected": True, "email": response.data[0]["sender_email"]}
        return {"connected": False, "email": None}
    except Exception as exc:
        logger.error("is_connected failed: %s", exc)
        return {"connected": False, "email": None}


def get_user_by_email(email: str) -> Optional[str]:
    """Looks up a user ID by their connected Gmail address."""
    try:
        response = _get_client().table("gmail_oauth_tokens").select("user_id").eq("sender_email", email).execute()
        if response.data:
            return response.data[0]["user_id"]
        return None
    except Exception as exc:
        logger.error("get_user_by_email failed: %s", exc)
        return None