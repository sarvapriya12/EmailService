import logging
from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager

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
from routes.payment_routes import router as payment_router
from config.settings import settings

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

    # Merge env-provided origins with hardcoded defaults
    default_origins = [
        "http://localhost:3000",
        "https://0f8c99b5.email-service-frontend.pages.dev",
    ]
    all_origins = list(set(settings.allowed_origins + default_origins))
    logger.info("CORS allowed origins: %s", all_origins)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=all_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", tags=["system"])
    def root() -> dict:
        return {
            "service": "AI Email Support System",
            "status": "running",
            "frontend_features": {
                "auth": "Supabase email/password + Gmail OAuth connection",
                "dashboard": "Key metrics (Emails Used, Open Tickets, Pending Approvals), recent tickets, and quick actions",
                "analytics": "Visual breakdown of tickets by category (bar chart) and resolution status (pie chart)",
                "tickets": "Complete inbox view with filtering, status management, and full two-way conversation threads (customer + AI replies)",
                "approval_queue": "Review mode feature allowing users to approve, edit, or reject AI-generated replies before they are sent",
                "business_profiles": "Pre-configured AI behavior presets (e-commerce, SaaS, agency) with customizable tone and style overrides",
                "filters": "Sender/domain whitelist and blacklist management for spam control",
                "settings": "Review mode toggle, Gmail account management, and notification preferences",
                "subscription": "Plan tier management, usage tracking (emails processed vs limit), and billing upgrades",
                "admin": "System-wide metrics and user tier management (restricted to admin users)"
            }
        }

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
    app.include_router(payment_router)
    app.include_router(task_router) # Include the task status router
    app.include_router(system_routes.router, tags=["System"])
    return app


app = create_app()