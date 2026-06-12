import os
import ssl
from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

celery_app = Celery(
    "email_service",
    broker=REDIS_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["tasks.email_tasks"]
)

_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}
_use_ssl = REDIS_URL.startswith("rediss://")

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_soft_time_limit=270,
    task_time_limit=300,
    **({"broker_use_ssl": _ssl, "redis_backend_use_ssl": _ssl} if _use_ssl else {})
)
