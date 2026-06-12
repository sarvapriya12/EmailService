import logging
import re
from typing import Optional

from services.llm_router import LLMRouter
from services.prompt_loader import render_prompt
from services.llm_router import PoolRouter, build_classify_pool

logger = logging.getLogger(__name__)


EMAIL_CATEGORIES = (
	"billing",
	"refund",
	"technical_support",
	"complaint",
	"feature_request",
	"general_inquiry",
)


from services.llm_router import PoolRouter, build_classify_pool

class EmailClassifier:
	"""Classifies customer emails into support categories."""

	def __init__(self, router: Optional[PoolRouter] = None) -> None:
		self.router = router or build_classify_pool()

	def classify(self, subject: str, body: str, categories: Optional[list[str]] = None) -> dict[str, object]:
		active_categories = categories or list(EMAIL_CATEGORIES)
		prompt = self._build_prompt(subject=subject, body=body, categories=active_categories)
		logger.info("Classifying email")

		response = self.router.invoke(prompt)
		category = self._parse_category(response, active_categories)

		return {
			"category": category,
			"reason": response.strip(),
			"raw_response": response,
		}

	def _build_prompt(self, subject: str, body: str, categories: list[str]) -> str:
		categories_str = ", ".join(categories)

		return render_prompt(
			"email_classifier.txt",
			categories=categories_str,
			subject=subject,
			body=body,
		)

	def _parse_category(self, response: str, categories: list[str]) -> str:
		normalized = response.lower()

		for category in categories:
			if re.search(rf"\b{re.escape(category)}\b", normalized):
				return category

		return "general_inquiry"


# File role: classify incoming support emails into a routing category.
# Structure: category list, router dependency, prompt builder, response parser, public classify method.
# Affects: services/extractor.py, services/email_generator.py, and any route that needs email triage.
 