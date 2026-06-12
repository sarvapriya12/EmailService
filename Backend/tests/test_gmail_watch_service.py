import base64
import json

import pytest

from schemas.pubsub import PubSubPushRequest
from services.gmail_watch_service import GmailWatchService


def build_notification(payload: dict[str, object]) -> PubSubPushRequest:
	encoded_payload = base64.urlsafe_b64encode(
		json.dumps(payload).encode("utf-8")
	).decode("utf-8")

	return PubSubPushRequest.model_validate(
		{
			"message": {
				"data": encoded_payload,
				"messageId": "message-123",
				"attributes": {"event": "gmail.watch"},
			},
			"subscription": "projects/example-project/subscriptions/gmail-watch",
		}
	)


def test_decode_message_data_returns_json_payload() -> None:
	service = GmailWatchService()
	payload = {"emailAddress": "user@example.com", "historyId": "98765"}
	notification = build_notification(payload)

	decoded = service.decode_message_data(notification.message.data)

	assert decoded == payload


def test_parse_notification_returns_gmail_watch_details() -> None:
	service = GmailWatchService()
	notification = build_notification(
		{"emailAddress": "user@example.com", "historyId": "98765"}
	)

	parsed = service.parse_notification(notification)

	assert parsed["status"] == "notification_received"
	assert parsed["email_address"] == "user@example.com"
	assert parsed["history_id"] == "98765"
	assert parsed["message_id"] == "message-123"
	assert parsed["subscription"] == "projects/example-project/subscriptions/gmail-watch"
	assert parsed["attributes"] == {"event": "gmail.watch"}


def test_parse_notification_rejects_missing_history_id() -> None:
	service = GmailWatchService()
	notification = build_notification({"emailAddress": "user@example.com"})

	with pytest.raises(ValueError, match="missing emailAddress or historyId"):
		service.parse_notification(notification)