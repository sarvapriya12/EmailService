from unittest.mock import patch
from services.email_pipeline_service import EmailPipelineService


class StubRouter:
	def __init__(self, responses: list[str]) -> None:
		self.responses = responses
		self.prompts: list[str] = []

	def invoke(self, prompt: str) -> str:
		self.prompts.append(prompt)
		return self.responses.pop(0)


class StubGmailService:
	def __init__(self) -> None:
		self.sent_replies: list[dict[str, str]] = []

	def send_reply(self, to_email: str, subject: str, body: str) -> dict[str, str]:
		self.sent_replies.append(
			{
				"to_email": to_email,
				"subject": subject,
				"body": body,
			}
		)
		return {"status": "sent", "to_email": to_email}


@patch("services.email_pipeline_service.is_sender_allowed", return_value=True)
def test_email_pipeline_processes_email_and_sends_reply(mock_is_sender_allowed) -> None:
	router = StubRouter(
		[
			"billing - invoice question",
			"customer_name: Alice\nissue: Invoice mismatch\npriority: high",
			"Thanks for writing in. We are checking the invoice now.",
		]
	)
	gmail = StubGmailService()
	service = EmailPipelineService(router=router, gmail=gmail)  # type: ignore[arg-type]

	result = service.process(
		sender_email="alice@example.com",
		subject="Invoice issue",
		body="I need help with my invoice.",
	)

	assert result.category == "billing"
	assert result.gmail_status == "sent"
	assert result.success is True
	assert gmail.sent_replies[0]["to_email"] == "alice@example.com"
	assert len(router.prompts) == 3