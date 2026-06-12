import logging
from typing import Any, Dict, List

from services.database import _get_client

logger = logging.getLogger(__name__)


def check_is_admin(user_id: str) -> bool:
    """Verifies if a user has super admin privileges."""
    try:
        response = _get_client().table("user_settings").select("is_admin").eq("user_id", user_id).execute()
        return bool(response.data and response.data[0].get("is_admin"))
    except Exception as exc:
        logger.error("check_is_admin failed: %s", exc)
        return False


def get_system_stats() -> Dict[str, Any]:
    """Aggregates high-level metrics for the entire system."""
    try:
        supabase = _get_client()
        
        # Total processed emails
        processed_res = supabase.table("processed_emails").select("id", count="exact").eq("status", "done").execute()
        failed_res = supabase.table("processed_emails").select("id", count="exact").eq("status", "failed").execute()
        
        # Total tickets
        tickets_res = supabase.table("tickets").select("id", count="exact").execute()
        
        # Total subscriptions (active users)
        subs_res = supabase.table("subscriptions").select("id", count="exact").execute()

        return {
            "total_emails_processed": processed_res.count or 0,
            "total_emails_failed": failed_res.count or 0,
            "total_tickets": tickets_res.count or 0,
            "total_users": subs_res.count or 0,
        }
    except Exception as exc:
        logger.error("get_system_stats failed: %s", exc)
        return {"error": "Failed to fetch stats"}


def get_all_users() -> List[Dict[str, Any]]:
    """Retrieves all users, their limits, and connected Gmail addresses."""
    try:
        supabase = _get_client()
        
        # Get subscriptions to see usage
        subs = supabase.table("subscriptions").select("*").execute().data or []
        
        # Get connected Gmails
        gmails = supabase.table("gmail_oauth_tokens").select("user_id, sender_email").execute().data or []
        gmail_map = {g["user_id"]: g["sender_email"] for g in gmails}

        for sub in subs:
            sub["connected_gmail"] = gmail_map.get(sub["user_id"])

        return subs
    except Exception as exc:
        logger.error("get_all_users failed: %s", exc)
        return []


def manual_upgrade_user(user_id: str, tier: str, new_limit: int) -> Dict[str, Any]:
    """Allows the admin to manually upgrade a user bypassing payment gateways."""
    try:
        response = _get_client().table("subscriptions").update({
            "tier": tier,
            "emails_limit": new_limit
        }).eq("user_id", user_id).execute()
        
        return {"status": "success", "subscription": response.data[0] if response.data else {}}
    except Exception as exc:
        logger.error("manual_upgrade_user failed: %s", exc)
        return {"status": "failed", "error": str(exc)}