import logging
from services.database import supabase

logger = logging.getLogger(__name__)

def get_or_create_subscription(user_id: str) -> dict:
    response = supabase.table("subscriptions").select("*").eq(
        "user_id", user_id
    ).execute()

    if response.data:
        return response.data[0]

    supabase.table("subscriptions").insert({
        "user_id": user_id,
        "tier": "free",
        "emails_used": 0,
        "emails_limit": 50,
    }).execute()

    return get_or_create_subscription(user_id)

def check_quota(user_id: str) -> bool:
    subscription = get_or_create_subscription(user_id)
    if subscription["tier"] == "free":
        return subscription["emails_used"] < subscription["emails_limit"]
    return True

def increment_usage(user_id: str) -> None:
    subscription = get_or_create_subscription(user_id)
    supabase.table("subscriptions").update({
        "emails_used": subscription["emails_used"] + 1
    }).eq("user_id", user_id).execute()

def get_subscription_info(user_id: str) -> dict:
    return get_or_create_subscription(user_id)