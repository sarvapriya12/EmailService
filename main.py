import logging
import os
from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import system_routes
from routes.auth_routes import router as auth_router
from routes.business_routes import router as business_router
from routes.email_routes import router
from routes.ticket_routes import router as ticket_router
from routes.task_routes import router as task_router
from routes.filter_routes import router as filter_router
from routes.queue_routes import router as queue_router
from routes.settings_routes import router as settings_router
from routes.gmail_oauth_routes import router as gmail_oauth_router
from routes.admin_routes import router as admin_router
import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from services.gmail_service import GmailService
        from services.database import update_last_history_id
        gmail = GmailService()
        result = gmail.watch_inbox()
        if result.get("status") == "watch_started" and result.get("history_id"):
            update_last_history_id(str(result["history_id"]), "system")
            logger.info("History ID updated on startup: %s", result["history_id"])
        logger.info("Gmail watch registered on startup: %s", result.get("status"))
    except Exception as exc:
        logger.error("Gmail watch registration failed on startup: %s", exc)
    
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="AI Email Support System",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {"message": "AI Email Support System is running"}

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(router)
    app.include_router(auth_router)
    app.include_router(ticket_router)
    app.include_router(filter_router)
    app.include_router(queue_router)
    app.include_router(settings_router)
    app.include_router(business_router)
    app.include_router(gmail_oauth_router)
    app.include_router(admin_router)
    app.include_router(task_router) # Include the task status router
    app.include_router(system_routes.router, tags=["System"])
    return app


app = create_app()