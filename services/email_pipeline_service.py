import logging
from typing import Optional

from schemas.email import EmailResponse, ExtractedData
from services.classifier import EmailClassifier
from services.email_generator import EmailGenerator
from services.extractor import EmailExtractor
from services.gmail_service import GmailService
from services.llm_router import LLMRouter
from services.ticket_service import get_or_create_ticket, add_message, update_ticket_status
from services.filter_service import is_sender_allowed
from services.approval_service import queue_reply
from services.settings_service import is_review_mode_enabled

logger = logging.getLogger(__name__)


class EmailPipelineService:
    """Runs the classify -> extract -> generate -> send pipeline."""

    def __init__(
        self,
        router: Optional[LLMRouter] = None,
        gmail: Optional[GmailService] = None,
        user_id: Optional[str] = None,
    ) -> None:
        self.router = router or LLMRouter()
        self.classifier = EmailClassifier(router=self.router)
        self.extractor = EmailExtractor(router=self.router)
        self.generator = EmailGenerator(router=self.router)
        self.gmail = gmail or GmailService()
        self.user_id = user_id

    def process(
        self,
        sender_email: str,
        subject: str,
        body: str,
        gmail_message_id: Optional[str] = None,
    ) -> EmailResponse:

        # Step 1 — Filter check
        if not is_sender_allowed(sender_email):
            logger.info("Sender %s blocked by filter — skipping pipeline", sender_email)
            return EmailResponse(
                category="filtered",
                extracted_data=None,
                generated_reply_subject="",
                generated_reply_body="",
                gmail_status="filtered",
                success=False,
            )

        # Step 2 — Classify, extract, generate
        classification = self.classifier.classify(subject=subject, body=body)
        extracted_raw = self.extractor.extract(subject=subject, body=body)
        reply = self.generator.generate(
            subject=subject,
            body=body,
            extracted=extracted_raw,
        )

        # Step 3 — Ticket management
        ticket_result = None
        ticket_id = None

        if self.user_id:
            ticket_result = get_or_create_ticket(
                sender_email=sender_email,
                subject=subject,
                user_id=self.user_id,
            )
            ticket = ticket_result.get("ticket")

            if ticket:
                ticket_id = ticket["id"]

                # Store inbound message
                add_message(
                    ticket_id=ticket_id,
                    direction="inbound",
                    body=body,
                    gmail_message_id=gmail_message_id,
                )

                # If ticket already existed — don't send auto-reply
                if not ticket_result.get("created"):
                    logger.info(
                        "Existing ticket %s for sender %s — skipping auto-reply",
                        ticket_id,
                        sender_email,
                    )
                    return EmailResponse(
                        category=classification["category"],
                        extracted_data=ExtractedData(**extracted_raw),
                        generated_reply_subject=reply["subject"],
                        generated_reply_body=reply["body"],
                        gmail_status="skipped_existing_ticket",
                        success=True,
                    )

        # Step 4 — Review mode check
        if self.user_id and is_review_mode_enabled(self.user_id):
            logger.info("Review mode ON — queuing reply for approval")
            queue_reply(
                ticket_id=ticket_id,
                sender_email=sender_email,
                reply_subject=reply["subject"],
                reply_body=reply["body"],
            )

            return EmailResponse(
                category=classification["category"],
                extracted_data=ExtractedData(**extracted_raw),
                generated_reply_subject=reply["subject"],
                generated_reply_body=reply["body"],
                gmail_status="queued_for_review",
                success=True,
            )

        # Step 5 — Send reply
        gmail_result = self.gmail.send_reply(
            to_email=sender_email,
            subject=reply["subject"],
            body=reply["body"],
        )

        # Step 6 — Store outbound message in ticket
        if ticket_id:
            add_message(
                ticket_id=ticket_id,
                direction="outbound",
                body=reply["body"],
            )

        return EmailResponse(
            category=classification["category"],
            extracted_data=ExtractedData(**extracted_raw),
            generated_reply_subject=reply["subject"],
            generated_reply_body=reply["body"],
            gmail_status=gmail_result["status"],
            success=gmail_result["status"] == "sent",
        )

    def process_incoming_email(
        self,
        sender_email: str,
        subject: str,
        body: str,
        gmail_message_id: Optional[str] = None,
    ) -> EmailResponse:
        return self.process(
            sender_email=sender_email,
            subject=subject,
            body=body,
            gmail_message_id=gmail_message_id,
        )