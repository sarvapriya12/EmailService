import logging
import re
from typing import Optional

from services.llm_router import LLMRouter
from services.prompt_loader import render_prompt


logger = logging.getLogger(__name__)


EXTRACTION_FIELDS = (
	"customer_name",
	"issue",
	"priority",
	"reference_number",
	"product_name",
)


class EmailExtractor:
	"""Extracts structured support details from email text."""

	def __init__(self, router: Optional[LLMRouter] = None) -> None:
		self.router = router or LLMRouter()

	def extract(self, subject: str, body: str) -> dict[str, object]:
		prompt = self._build_prompt(subject=subject, body=body)
		logger.info("Extracting email data")

		response = self.router.invoke(prompt)
		parsed = self._parse_response(response)
		parsed["raw_response"] = response

		return parsed

	def _build_prompt(self, subject: str, body: str) -> str:
		fields = ", ".join(EXTRACTION_FIELDS)

		return render_prompt(
			"email_extractor.txt",
			fields=fields,
			subject=subject,
			body=body,
		)

	def _parse_response(self, response: str) -> dict[str, object]:
		parsed: dict[str, object] = {field: None for field in EXTRACTION_FIELDS}

		for line in response.splitlines():
			if ":" not in line:
				continue

			key, value = line.split(":", 1)
			normalized_key = self._normalize_key(key)

			if normalized_key in parsed:
				# parsed[normalized_key] = value.strip() or None
				cleaned = value.strip()
				if cleaned.lower() in ("n/a", "none", "not provided", "not mentioned", "unknown", ""):
					parsed[normalized_key] = None
				else:
					parsed[normalized_key] = cleaned

		if parsed["priority"] is None:
			parsed["priority"] = self._infer_priority(response)

		return parsed

	def _normalize_key(self, key: str) -> str:
		cleaned = key.strip().lower().replace(" ", "_")

		aliases = {
			"customer": "customer_name",
			"customer_name": "customer_name",
			"name": "customer_name",
			"issue": "issue",
			"problem": "issue",
			"priority": "priority",
			"order_number": "reference_number",
			"order_no": "reference_number",
			"patient_id": "reference_number",
			"ticket_number": "reference_number",
			"case_number": "reference_number",
			"reference_number": "reference_number",
			"reference": "reference_number",
			"product_name": "product_name",
			"product": "product_name",
		}

		return aliases.get(cleaned, cleaned)

	def _infer_priority(self, response: str) -> str:
		lowered = response.lower()

		if re.search(r"\b(high|urgent|critical|asap|immediately)\b", lowered):
			return "high"

		if re.search(r"\b(low|minor|whenever|no rush)\b", lowered):
			return "low"

		return "medium"


# File role: turn raw email text into structured support fields.
# Structure: field list, router dependency, prompt builder, response parser, key normalizer, priority fallback.
# Affects: services/email_generator.py and any future schema or ticketing layer that consumes extracted email data.
#
# Flow diagram:
# raw email -> _build_prompt() -> LLMRouter.invoke() -> _parse_response() -> output dict
#
# Class layout:
# EmailExtractor
#   -> __init__()
#   -> extract()
#   -> _build_prompt()
#   -> _parse_response()
#   -> _normalize_key()
#   -> _infer_priority()
 