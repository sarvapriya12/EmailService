import pytest
import base64
import json
import hashlib
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta

from services.phonepe_service import (
    calculate_phonepe_checksum,
    verify_phonepe_webhook_signature,
    initiate_phonepe_payment
)
from services.payment_service import (
    create_checkout_intent,
    get_intent_status,
    process_webhook_notification,
    PLANS
)

# ----------------------------------------------------
# 1. Signature & Checksum Tests (Defensive Validation)
# ----------------------------------------------------

def test_calculate_phonepe_checksum() -> None:
    # Test vector values
    payload_b64 = "eyJrZXkiOiAidmFsdWUifQ=="  # {"key": "value"}
    endpoint = "/pg/v1/pay"
    salt_key = "test-salt-key-1234"
    salt_index = "1"
    
    expected_hash = hashlib.sha256(f"{payload_b64}{endpoint}{salt_key}".encode('utf-8')).hexdigest()
    expected_checksum = f"{expected_hash}###{salt_index}"
    
    checksum = calculate_phonepe_checksum(payload_b64, endpoint, salt_key, salt_index)
    assert checksum == expected_checksum

@patch("services.phonepe_service.settings")
def test_verify_phonepe_webhook_signature_valid(mock_settings) -> None:
    mock_settings.PHONEPE_SALT_KEY = "test-salt-key"
    mock_settings.PHONEPE_SALT_INDEX = "1"
    
    response_b64 = "eyJrZXkiOiAidmFsdWUifQ=="
    expected_hash = hashlib.sha256(f"{response_b64}test-salt-key".encode('utf-8')).hexdigest()
    valid_signature = f"{expected_hash}###1"
    
    # Should return True for valid signatures
    assert verify_phonepe_webhook_signature(response_b64, valid_signature) is True
    
    # Should return False for incorrect signatures
    invalid_signature = f"{expected_hash}###2"
    assert verify_phonepe_webhook_signature(response_b64, invalid_signature) is False
    assert verify_phonepe_webhook_signature(response_b64, "wrong-signature###1") is False

# ----------------------------------------------------
# 2. Idempotency Tests (Double Purchase Prevention)
# ----------------------------------------------------

@patch("services.payment_service._get_client")
@patch("services.payment_service.initiate_phonepe_payment")
def test_create_checkout_intent_idempotent(mock_initiate, mock_get_client) -> None:
    # Set up mock Supabase client response
    mock_supabase = MagicMock()
    mock_get_client.return_value = mock_supabase
    
    # Mock database return for an existing intent with the same idempotency key
    mock_query_res = MagicMock()
    mock_query_res.data = [{
        "id": "intent-123",
        "amount_paise": 29900,
        "currency": "INR",
        "status": "PENDING",
        "idempotency_key": "idem-key-999",
        "qr_payload": "upi://pay?pa=test",
        "expires_at": (datetime.now() + timedelta(minutes=1)).isoformat(),
        "plan_id": "pro"
    }]
    mock_supabase.table().select().eq().execute.return_value = mock_query_res
    
    # Call create_checkout_intent
    result = create_checkout_intent(
        user_id="user-123",
        plan_id="pro",
        idempotency_key="idem-key-999",
        redirect_url="http://localhost:3000/pricing"
    )
    
    # Verify it returned the existing intent without creating a new one or calling PhonePe
    assert result["intent_id"] == "intent-123"
    assert result["status"] == "PENDING"
    assert result["plan_id"] == "pro"
    mock_initiate.assert_not_called()

# ----------------------------------------------------
# 3. Input Validation Tests
# ----------------------------------------------------

def test_create_checkout_intent_invalid_plan() -> None:
    with pytest.raises(ValueError, match="Invalid plan selected"):
        create_checkout_intent(
            user_id="user-123",
            plan_id="invalid-tier-name",
            idempotency_key="idem-key",
            redirect_url="http://localhost:3000/pricing"
        )

def test_create_checkout_intent_free_plan_rejected() -> None:
    # Free tier should not proceed to payment gateway
    with pytest.raises(ValueError, match="Free plan does not require a payment flow"):
        create_checkout_intent(
            user_id="user-123",
            plan_id="free",
            idempotency_key="idem-key",
            redirect_url="http://localhost:3000/pricing"
        )

# ----------------------------------------------------
# 4. State Transition & Concurrency Lock Tests
# ----------------------------------------------------

@patch("services.payment_service._get_client")
def test_process_webhook_notification_concurrency_lock(mock_get_client) -> None:
    mock_supabase = MagicMock()
    mock_get_client.return_value = mock_supabase
    
    mock_intents_table = MagicMock()
    def table_mock(name):
        if name == "payment_intents":
            return mock_intents_table
        return MagicMock()
    mock_supabase.table.side_effect = table_mock
    
    # 1. Mock select query for intent in database
    mock_intent_res = MagicMock()
    mock_intent_res.data = [{
        "id": "intent-123",
        "amount_paise": 29900,
        "status": "PENDING",
        "user_id": "user-123",
        "plan_id": "pro",
        "version": 2
    }]
    mock_intents_table.select().eq().execute.return_value = mock_intent_res
    
    # 2. Mock atomic update failure (atomic check query returns empty array due to version mismatch)
    mock_update_res = MagicMock()
    mock_update_res.data = [] # Empty list indicates version mismatch (concurrent update took place)
    mock_intents_table.update().eq().eq().execute.return_value = mock_update_res
    
    # Call callback processing
    payload = {
        "success": True,
        "code": "PAYMENT_SUCCESS",
        "data": {
            "merchantTransactionId": "intent-123",
            "transactionId": "TXN-9999",
            "amount": 29900
        }
    }
    
    result = process_webhook_notification(payload)
    
    # Ensure it rejected the update gracefully with concurrency error
    assert result["status"] == "error"
    assert "concurrent updates detected" in result["message"].lower()

@patch("services.payment_service._get_client")
def test_process_webhook_notification_success_upgrades_subscription(mock_get_client) -> None:
    mock_supabase = MagicMock()
    mock_get_client.return_value = mock_supabase
    
    mock_intents_table = MagicMock()
    mock_subs_table = MagicMock()
    mock_purchases_table = MagicMock()
    
    def table_mock(name):
        if name == "payment_intents":
            return mock_intents_table
        elif name == "subscriptions":
            return mock_subs_table
        elif name == "plan_purchases":
            return mock_purchases_table
        return MagicMock()
    mock_supabase.table.side_effect = table_mock
    
    # 1. Mock select query for intent in database
    mock_intent_res = MagicMock()
    mock_intent_res.data = [{
        "id": "intent-123",
        "amount_paise": 29900,
        "status": "PENDING",
        "user_id": "user-123",
        "plan_id": "pro",
        "version": 1
    }]
    mock_intents_table.select().eq().execute.return_value = mock_intent_res
    
    # 2. Mock successful atomic update
    mock_update_res = MagicMock()
    mock_update_res.data = [{"id": "intent-123"}]
    mock_intents_table.update().eq().eq().execute.return_value = mock_update_res
    
    # 3. Mock subscription queries (check if existing sub exists)
    mock_sub_res = MagicMock()
    mock_sub_res.data = [] # Empty list indicates new subscription creation
    mock_subs_table.select().eq().execute.return_value = mock_sub_res
    
    # Mock insert actions
    mock_subs_table.insert().execute.return_value = MagicMock(data=[{"id": "sub-123"}])
    mock_purchases_table.insert().execute.return_value = MagicMock(data=[{"id": "purchase-123"}])
    
    payload = {
        "success": True,
        "code": "PAYMENT_SUCCESS",
        "data": {
            "merchantTransactionId": "intent-123",
            "transactionId": "TXN-9999",
            "amount": 29900
        }
    }
    
    result = process_webhook_notification(payload)
    
    assert result["status"] == "success"
    
    # Ensure it updated payment intent to COMPLETED
    from unittest.mock import ANY
    mock_intents_table.update.assert_any_call({
        "status": "COMPLETED",
        "provider_ref": "TXN-9999",
        "completed_at": ANY,
        "version": 2
    })
    
    # Ensure it registered new subscription and created purchase log audit entry
    mock_subs_table.insert.assert_any_call(ANY)
    mock_purchases_table.insert.assert_any_call(ANY)

