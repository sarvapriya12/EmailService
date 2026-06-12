import logging
import threading
from config.settings import settings

logger = logging.getLogger(__name__)

_supabase_client = None
_db_lock = threading.Lock()

def _get_client():
    # from supabase import create_client
    # return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    global _supabase_client
    if _supabase_client is None:
        with _db_lock:
            if _supabase_client is None:
                from supabase import create_client
                _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client


def acquire_idempotency_lock(idempotency_key: str, user_id: str, message_id: str) -> bool:
    try:
        _get_client().table("processed_emails").insert({
            "id": idempotency_key,
            "user_id": user_id,
            "message_id": message_id,
            "status": "processing",
        }).execute()
        return True
    except Exception as exc:
        if "duplicate key value" in str(exc).lower() or "23505" in str(exc) or "conflict" in str(exc).lower():
            # Retry-safe processing: check if previous attempt failed
            try:
                response = _get_client().table("processed_emails").select("status").eq("id", idempotency_key).execute()
                if response.data and response.data[0]["status"] == "failed":
                    _get_client().table("processed_emails").update({"status": "processing"}).eq("id", idempotency_key).execute()
                    logger.info("Re-acquired lock for previously failed message: %s", idempotency_key)
                    return True
            except Exception as inner_exc:
                logger.warning("Failed to check retry status for %s: %s", idempotency_key, inner_exc)
            return False
        logger.warning("Idempotency lock failed for %s: %s", idempotency_key, exc)
        return False


def mark_as_processed(
    idempotency_key: str,
    status: str,
) -> None:
    try:
        _get_client().table("processed_emails").update({
            "status": status,
        }).eq("id", idempotency_key).execute()
    except Exception as exc:
        logger.error("mark_as_processed failed: %s", exc, exc_info=True)


def get_last_history_id(user_id: str = "system") -> str:
    try:
        response = _get_client().table("gmail_watch_state").select("last_history_id").eq(
            "user_id", user_id
        ).execute()
        if response.data:
            return response.data[0]["last_history_id"]
        return "0"
    except Exception as exc:
        logger.error("get_last_history_id failed: %s", exc)
        return "0"


def update_last_history_id(history_id: str, user_id: str = "system") -> None:
    try:
        _get_client().table("gmail_watch_state").upsert({
            "user_id": user_id,
            "last_history_id": history_id,
        }, on_conflict="user_id").execute()
    except Exception as exc:
        logger.error("update_last_history_id failed: %s", exc)