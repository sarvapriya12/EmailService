import logging
from fastapi import APIRouter, Depends, HTTPException

from celery_app import celery_app
from services.auth_guard import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("/{task_id}")
def get_task_status(task_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    """
    Fetch the status of a background Celery task.
    Used by the frontend to poll for completion of async email processing.
    """
    try:
        task_result = celery_app.AsyncResult(task_id)
        return {
            "task_id": task_id,
            "status": task_result.status,
            "result": task_result.result if task_result.ready() else None
        }
    except Exception as exc:
        logger.error("Failed to get task status for %s: %s", task_id, exc)
        raise HTTPException(status_code=500, detail="Internal server error")