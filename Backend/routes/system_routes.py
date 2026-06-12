import logging
import os
from typing import Optional
from fastapi import APIRouter, Header, HTTPException

from services.database import _get_client
from services.gmail_service import GmailService

logger = logging.getLogger(__name__)

router = APIRouter()

# The secret key used to protect the cron endpoint from public access
CRON_SECRET_KEY = os.environ.get("CRON_SECRET_KEY")

@router.post("/system/renew-watches")
def renew_gmail_watches(x_cron_secret: Optional[str] = Header(default=None, alias="X-Cron-Secret")):
    """
    External cron endpoint to renew Gmail watches for all connected users.
    Must be called daily (e.g., via cron-job.org) to prevent 7-day expiration.
    """
    if not CRON_SECRET_KEY:
        logger.error("CRON_SECRET_KEY is not configured in the environment.")
        raise HTTPException(status_code=500, detail="Server configuration error")
        
    if x_cron_secret != CRON_SECRET_KEY:
        logger.warning("Unauthorized attempt to access /system/renew-watches")
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        supabase = _get_client()
        # Fetch all users who have an active Gmail connection
        response = supabase.table("gmail_oauth_tokens").select("user_id").execute()
        
        if not response.data:
            return {"status": "success", "message": "No connected users found. Nothing to renew."}
            
        success_count = 0
        failure_count = 0
        
        for record in response.data:
            user_id = record["user_id"]
            try:
                gmail = GmailService(user_id=user_id)
                result = gmail.watch_inbox()
                if result.get("status") == "success" or "historyId" in result:
                    success_count += 1
                else:
                    failure_count += 1
                    logger.warning("Failed to renew watch for user %s: %s", user_id, result.get("error", "Unknown error"))
            except Exception as e:
                failure_count += 1
                logger.error("Error renewing watch for user %s: %s", user_id, e)
                
        return {
            "status": "success",
            "message": f"Renewed watches for {success_count} users. Failed for {failure_count} users."
        }
        
    except Exception as exc:
        logger.error("system/renew-watches failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")