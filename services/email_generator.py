import logging
from typing import Optional

from services.llm_router import LLMRouter


logger = logging.getLogger(__name__)


class EmailGenerator:
	"""Generates support replies from extracted email context."""

	def __init__(self, router: Optional[LLMRouter] = None) -> None:
		self.router = router or LLMRouter()

	def generate(self, subject: str, body: str, extracted: dict[str, object]) -> dict[str, str]:
		prompt = self._build_prompt(subject, body, extracted)
		logger.info("Generating support reply")

		response = self.router.invoke(prompt)

		return {
			"subject": f"Re: {subject}",
			"body": response.strip(),
		}

	def _build_prompt(self, subject: str, body: str, extracted: dict[str, object]) -> str:
		customer_name = extracted.get("customer_name") or "customer"
		issue = extracted.get("issue") or "the reported issue"
		priority = extracted.get("priority") or "medium"

		return (
			"Write a concise professional support reply. "
			"Acknowledge the issue, confirm understanding, and keep the tone helpful.\n\n"
			f"Subject: {subject}\n"
			f"Body: {body}\n"
			f"Customer: {customer_name}\n"
			f"Issue: {issue}\n"
			f"Priority: {priority}\n"
		)


# File role: generate a support reply using the extracted email context.
# Structure: router dependency, public generate method, prompt builder for reply drafting.
# Affects: services/gmail_service.py and any route that returns or sends the final response text.
 