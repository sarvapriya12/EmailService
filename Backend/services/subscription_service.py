import logging
from services.database import _get_client

logger = logging.getLogger(__name__)

def get_or_create_subscription(user_id: str) -> dict:
    try:
        supabase = _get_client()
        response = supabase.table("subscriptions").select("*").eq(
            "user_id", user_id
        ).execute()

        if response.data:
            return response.data[0]

        insert_response = supabase.table("subscriptions").insert({
            "user_id": user_id,
            "tier": "free",
            "emails_used": 0,
            "emails_limit": 25,
        }).execute()

        if insert_response.data:
            return insert_response.data[0]

        logger.error("Subscription insert returned no data for user %s", user_id)
        return {
            "user_id": user_id,
            "tier": "free",
            "emails_used": 0,
            "emails_limit": 25,
            "status": "active",
        }
    except Exception as exc:
        logger.error("get_or_create_subscription failed: %s", exc, exc_info=True)
        return {
            "user_id": user_id,
            "tier": "free",
            "emails_used": 0,
            "emails_limit": 25,
            "status": "active",
        }

def check_quota(user_id: str) -> bool:
    subscription = get_or_create_subscription(user_id)
    return subscription["emails_used"] < subscription["emails_limit"]

def increment_usage(user_id: str) -> None:
    subscription = get_or_create_subscription(user_id)
    try:
        supabase = _get_client()
        supabase.table("subscriptions").update({
            "emails_used": subscription["emails_used"] + 1
        }).eq("user_id", user_id).execute()
    except Exception as exc:
        logger.error("increment_usage failed: %s", exc, exc_info=True)

def get_subscription_info(user_id: str) -> dict:
    return get_or_create_subscription(user_id)

def upgrade_subscription(user_id: str, tier: str) -> dict:
    limits = {
        "free": 25,
        "pro": 500,
        "pro_yearly": 500,
        "enterprise": 1500,
        "enterprise_yearly": 1500
    }
    limit = limits.get(tier.lower(), 50)
    try:
        supabase = _get_client()
        response = supabase.table("subscriptions").update({
            "tier": tier.lower(),
            "emails_limit": limit
        }).eq("user_id", user_id).execute()
        if response.data:
            return response.data[0]
        return {
            "user_id": user_id,
            "tier": tier.lower(),
            "emails_limit": limit,
            "emails_used": 0,
            "status": "active"
        }
    except Exception as exc:
        logger.error("upgrade_subscription failed: %s", exc, exc_info=True)
        return {"error": str(exc)}