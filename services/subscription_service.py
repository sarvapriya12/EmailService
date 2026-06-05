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
            "emails_limit": 50,
        }).execute()

        if insert_response.data:
            return insert_response.data[0]

        logger.error("Subscription insert returned no data for user %s", user_id)
        return {
            "user_id": user_id,
            "tier": "free",
            "emails_used": 0,
            "emails_limit": 50,
            "status": "active",
        }
    except Exception as exc:
        logger.error("get_or_create_subscription failed: %s", exc, exc_info=True)
        return {
            "user_id": user_id,
            "tier": "free",
            "emails_used": 0,
            "emails_limit": 50,
            "status": "active",
        }

def check_quota(user_id: str) -> bool:
    subscription = get_or_create_subscription(user_id)
    if subscription["tier"] == "free":
        return subscription["emails_used"] < subscription["emails_limit"]
    return True

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