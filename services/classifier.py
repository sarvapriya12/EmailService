import logging
import re
from typing import Optional

from services.llm_router import LLMRouter
from services.prompt_loader import render_prompt


logger = logging.getLogger(__name__)


EMAIL_CATEGORIES = (
	"billing",
	"refund",
	"technical_support",
	"complaint",
	"feature_request",
	"general_inquiry",
)


class EmailClassifier:
	"""Classifies customer emails into support categories."""

	def __init__(self, router: Optional[LLMRouter] = None) -> None:
		self.router = router or LLMRouter()

	def classify(self, subject: str, body: str) -> dict[str, object]:
		prompt = self._build_prompt(subject=subject, body=body)
		logger.info("Classifying email")

		response = self.router.invoke(prompt)
		category = self._parse_category(response)

		return {
			"category": category,
			"reason": response.strip(),
			"raw_response": response,
		}

	def _build_prompt(self, subject: str, body: str) -> str:
		categories = ", ".join(EMAIL_CATEGORIES)

		return render_prompt(
			"email_classifier.txt",
			categories=categories,
			subject=subject,
			body=body,
		)

	def _parse_category(self, response: str) -> str:
		normalized = response.lower()

		for category in EMAIL_CATEGORIES:
			if re.search(rf"\b{re.escape(category)}\b", normalized):
				return category

		return "general_inquiry"


# File role: classify incoming support emails into a routing category.
# Structure: category list, router dependency, prompt builder, response parser, public classify method.
# Affects: services/extractor.py, services/email_generator.py, and any route that needs email triage.
 