import base64
from email.utils import parseaddr
import logging
from email.mime.text import MIMEText
from typing import Any

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

    @staticmethod
    def decode_base64url_text(data: str) -> str:
        padded_data = data + ("=" * (-len(data) % 4))
        return base64.urlsafe_b64decode(padded_data.encode("utf-8")).decode("utf-8")

    @staticmethod
    def extract_sender_email(from_header: str) -> str:
        _, email_address = parseaddr(from_header)
        return email_address or from_header.strip()

    @staticmethod
    def extract_message_text(payload: dict[str, Any]) -> str:
        body = payload.get("body", {}) or {}
        data = body.get("data")

        if data:
            return GmailService.decode_base64url_text(data)

        for part in payload.get("parts", []) or []:
            if part.get("mimeType") == "text/plain":
                text = GmailService.extract_message_text(part)
                if text:
                    return text

        for part in payload.get("parts", []) or []:
            text = GmailService.extract_message_text(part)
            if text:
                return text

        return ""

    @staticmethod
    def parse_message(message: dict[str, Any]) -> dict[str, str]:
        payload = message.get("payload", {}) or {}
        headers = {
            str(header.get("name", "")).lower(): str(header.get("value", ""))
            for header in payload.get("headers", []) or []
        }

        from_header = headers.get("from", "").strip()

        return {
            "message_id": str(message.get("id", "")).strip(),
            "thread_id": str(message.get("threadId", "")).strip(),
            "sender_email": GmailService.extract_sender_email(from_header),
            "from_header": from_header,
            "subject": headers.get("subject", "").strip(),
            "body": GmailService.extract_message_text(payload).strip(),
        }

    def _collect_message_ids_since(self, history_id: str) -> list[str]:
        message_ids: list[str] = []
        page_token: str | None = None

        while True:
            response = self.service.users().history().list(
                userId="me",
                startHistoryId=history_id,
                historyTypes=["messageAdded"],
                pageToken=page_token,
            ).execute()

            for history_item in response.get("history", []) or []:
                for message_added in history_item.get("messagesAdded", []) or []:
                    message = message_added.get("message", {}) or {}
                    message_id = str(message.get("id", "")).strip()

                    if message_id:
                        message_ids.append(message_id)

            page_token = response.get("nextPageToken")

            if not page_token:
                break

        return message_ids

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

    def watch_inbox(self) -> dict[str, object]:
        if not settings.GMAIL_WATCH_TOPIC_NAME:
            return {
                "status": "failed",
                "error": "GMAIL_WATCH_TOPIC_NAME is not configured",
            }

        try:
            response = self.service.users().watch(
                userId="me",
                body={
                    "topicName": settings.GMAIL_WATCH_TOPIC_NAME,
                    "labelIds": ["INBOX"],
                    "labelFilterAction": "include",
                },
            ).execute()

            return {
                "status": "watch_started",
                "email_address": response.get("emailAddress"),
                "history_id": response.get("historyId"),
                "expiration": response.get("expiration"),
                "raw_response": response,
            }
        except Exception as exc:
            logger.error("Gmail watch setup failed: %s", exc)
            return {"status": "failed", "error": str(exc)}

    def fetch_latest_message_since(self, history_id: str) -> dict[str, object]:
        try:
            message_ids = self._collect_message_ids_since(history_id)

            if not message_ids:
                return {
                    "status": "failed",
                    "error": "No new Gmail messages were found for the supplied history ID",
                }

            latest_message_id = message_ids[-1]
            message = self.service.users().messages().get(
                userId="me",
                id=latest_message_id,
                format="full",
            ).execute()

            parsed_message = self.parse_message(message)

            return {
                "status": "message_fetched",
                "history_id": history_id,
                "message_id": parsed_message["message_id"],
                "thread_id": parsed_message["thread_id"],
                "sender_email": parsed_message["sender_email"],
                "from_header": parsed_message["from_header"],
                "subject": parsed_message["subject"],
                "body": parsed_message["body"],
                "raw_message": message,
            }
        except Exception as exc:
            logger.error("Failed to fetch Gmail message from history: %s", exc)
            return {"status": "failed", "error": str(exc)}