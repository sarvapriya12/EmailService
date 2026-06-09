import os
from celery import Celery

# Use environment variables for the Redis URL, falling back to a local Redis default.
# If you use a cloud service like Upstash, you'll set REDIS_URL in your .env file.
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

# Initialize the Celery app
celery_app = Celery(
    "email_service",
    broker=REDIS_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["tasks.email_tasks"]
)

# Configure standard Celery settings
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_soft_time_limit=270,
    task_time_limit=300,
    broker_use_ssl={"ssl_cert_reqs": None} if REDIS_URL.startswith("rediss://") else None,
    redis_backend_use_ssl={"ssl_cert_reqs": None} if CELERY_RESULT_BACKEND.startswith("rediss://") else None,
)