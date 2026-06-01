import base64
import binascii
import json
import logging
from typing import Any

from schemas.pubsub import PubSubPushRequest


logger = logging.getLogger(__name__)


class GmailWatchService:
	"""Parses Gmail watch Pub/Sub push notifications."""

	@staticmethod
	def decode_message_data(encoded_data: str) -> dict[str, Any]:
		padded_data = encoded_data + ("=" * (-len(encoded_data) % 4))

		try:
			decoded_bytes = base64.urlsafe_b64decode(padded_data.encode("utf-8"))
			decoded_text = decoded_bytes.decode("utf-8")
			payload = json.loads(decoded_text)
		except (binascii.Error, UnicodeDecodeError, json.JSONDecodeError) as exc:
			raise ValueError("Invalid Pub/Sub message payload") from exc

		if not isinstance(payload, dict):
			raise ValueError("Pub/Sub message payload must be a JSON object")

		return payload

	def parse_notification(self, notification: PubSubPushRequest) -> dict[str, Any]:
		payload = self.decode_message_data(notification.message.data)
		email_address = str(payload.get("emailAddress", "")).strip()
		history_id = str(payload.get("historyId", "")).strip()

		if not email_address or not history_id:
			raise ValueError("Gmail watch notification is missing emailAddress or historyId")

		logger.info(
			"Received Gmail watch notification for %s with history_id=%s",
			email_address,
			history_id,
		)

		return {
			"status": "notification_received",
			"subscription": notification.subscription,
			"message_id": notification.message.message_id,
			"email_address": email_address,
			"history_id": history_id,
			"attributes": notification.message.attributes,
			"payload": payload,
		}