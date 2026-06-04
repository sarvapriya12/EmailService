import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from routes.auth_routes import router as auth_router
from routes.email_routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from services.gmail_service import GmailService
        gmail = GmailService()
        result = gmail.watch_inbox()
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

    @app.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {"message": "AI Email Support System is running"}

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(router)
    app.include_router(auth_router)
    return app


app = create_app()