import logging
from typing import Optional

from services.llm_router import LLMRouter
from services.prompt_loader import render_prompt
from services.llm_router import PoolRouter, build_generate_pool

logger = logging.getLogger(__name__)


class EmailGenerator:
	"""Generates support replies from extracted email context."""

	def __init__(self, router: Optional[PoolRouter] = None) -> None:
		self.router = router or build_generate_pool()

	def generate(
		self, 
		subject: str, 
		body: str, 
		extracted: dict[str, object],
		tone: str = "friendly",
		style: str = "concise"
	) -> dict[str, str]:
		prompt = self._build_prompt(subject, body, extracted, tone, style)
		logger.info("Generating support reply")

		response = self.router.invoke(prompt)

		return {
			"subject": f"Re: {subject}",
			"body": response.strip(),
		}

	def _build_prompt(
		self, 
		subject: str, 
		body: str, 
		extracted: dict[str, object],
		tone: str,
		style: str
	) -> str:
		customer_name = extracted.get("customer_name") or "customer"
		issue = extracted.get("issue") or "the reported issue"
		priority = extracted.get("priority") or "medium"

		return render_prompt(
			"email_generator.txt",
			subject=subject,
			body=body,
			customer_name=customer_name,
			issue=issue,
			priority=priority,
			tone=tone,
			style=style,
		)


# File role: generate a support reply using the extracted email context.
# Structure: router dependency, public generate method, prompt builder for reply drafting.
# Affects: services/gmail_service.py and any route that returns or sends the final response text.
 