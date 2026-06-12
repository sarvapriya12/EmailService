#!/bin/sh
celery -A celery_app worker --loglevel=info --pool=solo --concurrency=1 &
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
