import base64
import logging
from email.mime.text import MIMEText

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from config.settings import settings

logger = logging.getLogger(__name__)


class GmailService:
    """Sends replies through Gmail."""

    def __init__(self) -> None:
        self.service = self._build_service()

    def _build_service(self):
        creds = Credentials(
            token=None,
            refresh_token=settings.GMAIL_REFRESH_TOKEN,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GMAIL_CLIENT_ID,
            client_secret=settings.GMAIL_CLIENT_SECRET,
        )
        creds.refresh(Request())
        return build("gmail", "v1", credentials=creds)

    def send_reply(self, to_email: str, subject: str, body: str) -> dict[str, str]:
        logger.info("Preparing Gmail send for %s", to_email)
        try:
            message = MIMEText(body)
            message["to"] = to_email
            message["from"] = settings.GMAIL_SENDER_EMAIL
            message["subject"] = subject

            encoded = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode()

            self.service.users().messages().send(
                userId="me",
                body={"raw": encoded},
            ).execute()

            logger.info("Email sent to %s", to_email)
            return {"status": "sent", "to_email": to_email}

        except Exception as exc:
            logger.error("Gmail send failed: %s", exc)
            return {"status": "failed", "error": str(exc)}