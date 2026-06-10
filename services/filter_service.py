import logging
import fnmatch
from services.database import _get_client

logger = logging.getLogger(__name__)


def is_sender_allowed(sender_email: str) -> bool:
    try:
        response = _get_client().table("email_filters").select("type, pattern").execute()
        filters = response.data or []

        blacklist = [f["pattern"] for f in filters if f["type"] == "blacklist"]
        whitelist = [f["pattern"] for f in filters if f["type"] == "whitelist"]

        # Check blacklist first
        for pattern in blacklist:
            if fnmatch.fnmatch(sender_email.lower(), pattern.lower()):
                logger.info("Sender %s blocked by blacklist pattern: %s", sender_email, pattern)
                return False

        # If whitelist has entries, sender must match one
        if whitelist:
            for pattern in whitelist:
                if fnmatch.fnmatch(sender_email.lower(), pattern.lower()):
                    return True
            logger.info("Sender %s not in whitelist — blocked", sender_email)
            return False

        # No whitelist — allow all non-blacklisted senders
        return True

    except Exception as exc:
        logger.error("is_sender_allowed failed: %s", exc)
        return True  # Fail open — allow on DB error


def is_sender_whitelisted(sender_email: str) -> bool:
    try:
        response = _get_client().table("email_filters").select("type, pattern").execute()
        filters = response.data or []
        whitelist = [f["pattern"] for f in filters if f["type"] == "whitelist"]

        for pattern in whitelist:
            if fnmatch.fnmatch(sender_email.lower(), pattern.lower()):
                return True
        return False
    except Exception as exc:
        logger.error("is_sender_whitelisted failed: %s", exc)
        return False


def add_filter(user_id: str, filter_type: str, pattern: str) -> dict:
    try:
        response = _get_client().table("email_filters").insert({
            "user_id": user_id,
            "type": filter_type,
            "pattern": pattern.lower(),
        }).execute()
        return {"status": "created", "filter": response.data[0] if response.data else {}}
    except Exception as exc:
        logger.error("add_filter failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def remove_filter(filter_id: str) -> dict:
    try:
        _get_client().table("email_filters").delete().eq("id", filter_id).execute()
        return {"status": "deleted"}
    except Exception as exc:
        logger.error("remove_filter failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


def get_filters(user_id: str) -> list:
    try:
        response = _get_client().table("email_filters").select("*").eq(
            "user_id", user_id
        ).execute()
        return response.data or []
    except Exception as exc:
        logger.error("get_filters failed: %s", exc)
        return []