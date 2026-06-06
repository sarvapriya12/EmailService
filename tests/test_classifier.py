from services.classifier import EmailClassifier


class StubRouter:
    def __init__(self, response: str) -> None:
        self.response = response
        self.prompts: list[str] = []

    def invoke(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.response


def test_classify_returns_expected_category_and_prompt() -> None:
    router = StubRouter("billing - the customer asks about an invoice")
    classifier = EmailClassifier(router=router)

    result = classifier.classify(
        subject="Invoice question",
        body="Please explain the charge on my latest bill.",
    )

    assert result["category"] == "billing"
    assert result["reason"] == "billing - the customer asks about an invoice"
    assert result["raw_response"] == "billing - the customer asks about an invoice"
    assert len(router.prompts) == 1
    assert "Subject: Invoice question" in router.prompts[0]
    assert "Body: Please explain the charge on my latest bill." in router.prompts[0]


def test_classify_defaults_to_general_inquiry_when_category_is_missing() -> None:
    router = StubRouter("This is a follow-up about my account.")
    classifier = EmailClassifier(router=router)

    result = classifier.classify(
        subject="Account follow-up",
        body="I need help with my account status.",
    )

    assert result["category"] == "general_inquiry"
    assert result["reason"] == "This is a follow-up about my account."
    assert result["raw_response"] == "This is a follow-up about my account."


def test_parse_category_handles_uppercase_billing_response() -> None:
    classifier = EmailClassifier(router=StubRouter("billing"))

    result = classifier._parse_category("BILLING - uppercase response", ["billing", "general_inquiry"])

    assert result == "billing"


def test_parse_category_defaults_to_general_inquiry_for_empty_response() -> None:
    classifier = EmailClassifier(router=StubRouter("billing"))

    result = classifier._parse_category("", ["billing", "general_inquiry"])

    assert result == "general_inquiry"


def test_parse_category_returns_general_inquiry_for_hyphenated_feature_request() -> None:
    classifier = EmailClassifier(router=StubRouter("billing"))

    result = classifier._parse_category("feature-request - user wants dark mode", ["billing", "general_inquiry"])

    assert result == "general_inquiry"


def test_classify_uses_custom_categories() -> None:
    router = StubRouter("custom_category - customer issue")
    classifier = EmailClassifier(router=router)

    custom_categories = ["custom_category", "other_category"]
    result = classifier.classify(
        subject="Custom issue",
        body="Help with custom issue.",
        categories=custom_categories
    )

    assert result["category"] == "custom_category"
    assert "custom_category, other_category" in router.prompts[0]