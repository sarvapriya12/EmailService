import base64

from services.gmail_service import GmailService


class StubMessagesGet:
	def __init__(self, response: dict[str, object]) -> None:
		self.response = response

	def execute(self) -> dict[str, object]:
		return self.response


class StubMessages:
	def __init__(self, messages: dict[str, dict[str, object]]) -> None:
		self.messages = messages

	def get(self, userId: str, id: str, format: str) -> StubMessagesGet:  # noqa: N803
		return StubMessagesGet(self.messages[id])


class StubHistoryList:
	def __init__(self, response: dict[str, object]) -> None:
		self.response = response

	def execute(self) -> dict[str, object]:
		return self.response


class StubHistory:
	def __init__(self, response: dict[str, object]) -> None:
		self.response = response

	def list(
		self,
		userId: str,  # noqa: N803
		startHistoryId: str,  # noqa: N803
		historyTypes: list[str],
		pageToken: str | None = None,  # noqa: N803
	):
		return StubHistoryList(self.response)


class StubUsers:
	def __init__(self, history_response: dict[str, object], messages: dict[str, dict[str, object]]) -> None:
		self._history = StubHistory(history_response)
		self._messages = StubMessages(messages)

	def history(self) -> StubHistory:
		return self._history

	def messages(self) -> StubMessages:
		return self._messages


class StubGmailApi:
	def __init__(self, history_response: dict[str, object], messages: dict[str, dict[str, object]]) -> None:
		self._users = StubUsers(history_response, messages)

	def users(self) -> StubUsers:
		return self._users


def test_decode_base64url_text_handles_missing_padding() -> None:
	encoded = base64.urlsafe_b64encode(b"hello world").decode("utf-8").rstrip("=")

	assert GmailService.decode_base64url_text(encoded) == "hello world"


def test_parse_message_extracts_sender_subject_and_plain_text_body() -> None:
	plain_text = base64.urlsafe_b64encode(b"Hello from Gmail").decode("utf-8").rstrip("=")
	html_text = base64.urlsafe_b64encode(b"<p>Hello from Gmail</p>").decode("utf-8").rstrip("=")

	message = {
		"id": "message-123",
		"threadId": "thread-456",
		"payload": {
			"headers": [
				{"name": "From", "value": "Support Team <support@example.com>"},
				{"name": "Subject", "value": "Need help"},
			],
			"parts": [
				{"mimeType": "text/html", "body": {"data": html_text}},
				{"mimeType": "text/plain", "body": {"data": plain_text}},
			],
		},
	}

	parsed = GmailService.parse_message(message)

	assert parsed["message_id"] == "message-123"
	assert parsed["thread_id"] == "thread-456"
	assert parsed["sender_email"] == "support@example.com"
	assert parsed["from_header"] == "Support Team <support@example.com>"
	assert parsed["subject"] == "Need help"
	assert parsed["body"] == "Hello from Gmail"

def test_fetch_latest_message_since_returns_parsed_message() -> None:
	history_response = {
		"history": [
			{
				"messagesAdded": [
					{"message": {"id": "message-123", "threadId": "thread-456"}},
				]
			}
		]
	}
	message_response = {
		"id": "message-123",
		"threadId": "thread-456",
		"payload": {
			"headers": [
				{"name": "From", "value": "Support Team <support@example.com>"},
				{"name": "Subject", "value": "Need help"},
			],
			"body": {"data": base64.urlsafe_b64encode(b"Hello from Gmail").decode("utf-8")},
		},
	}
	gmail_service = GmailService.__new__(GmailService)
	gmail_service.service = StubGmailApi(history_response, {"message-123": message_response})

	result = gmail_service.fetch_latest_message_since("history-789")

	assert result["status"] == "message_fetched"
	assert result["history_id"] == "history-789"
	assert result["message_id"] == "message-123"
	assert result["sender_email"] == "support@example.com"
	assert result["subject"] == "Need help"
	assert result["body"] == "Hello from Gmail"