from typing import Optional

from schemas.email import EmailResponse, ExtractedData
from services.classifier import EmailClassifier
from services.email_generator import EmailGenerator
from services.extractor import EmailExtractor
from services.gmail_service import GmailService
from services.llm_router import LLMRouter


class EmailPipelineService:
	"""Runs the classify -> extract -> generate -> send pipeline."""

	def __init__(
		self,
		router: Optional[LLMRouter] = None,
		gmail: Optional[GmailService] = None,
	) -> None:
		self.router = router or LLMRouter()
		self.classifier = EmailClassifier(router=self.router)
		self.extractor = EmailExtractor(router=self.router)
		self.generator = EmailGenerator(router=self.router)
		self.gmail = gmail or GmailService()

	def process(self, sender_email: str, subject: str, body: str) -> EmailResponse:
		classification = self.classifier.classify(subject=subject, body=body)
		extracted_raw = self.extractor.extract(subject=subject, body=body)
		reply = self.generator.generate(subject=subject, body=body, extracted=extracted_raw)
		gmail_result = self.gmail.send_reply(
			to_email=sender_email,
			subject=reply["subject"],
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

	def process_incoming_email(self, sender_email: str, subject: str, body: str) -> EmailResponse:
		return self.process(sender_email=sender_email, subject=subject, body=body)