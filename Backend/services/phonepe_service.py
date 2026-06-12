import base64
import json
import hashlib
import logging
import requests
from typing import Dict, Any, Optional
from config.settings import settings

logger = logging.getLogger(__name__)

# PhonePe Base URLs
PHONEPE_URLS = {
    "UAT": "https://api-preprod.phonepe.com/apis/pg-sandbox",
    "PROD": "https://api.phonepe.com/apis/hermes"
}

def get_phonepe_base_url() -> str:
    env = settings.PHONEPE_ENV.upper()
    return PHONEPE_URLS.get(env, PHONEPE_URLS["UAT"])

def calculate_phonepe_checksum(payload_b64: str, endpoint: str, salt_key: str, salt_index: str) -> str:
    """
    Generate X-VERIFY checksum header for PhonePe requests:
    SHA256(base64Payload + endpoint + saltKey) + "###" + saltIndex
    """
    main_string = f"{payload_b64}{endpoint}{salt_key}"
    sha256_hash = hashlib.sha256(main_string.encode('utf-8')).hexdigest()
    return f"{sha256_hash}###{salt_index}"

def verify_phonepe_webhook_signature(response_b64: str, signature_header: str) -> bool:
    """
    Verify webhook signature:
    SHA256(response_b64 + saltKey) + "###" + saltIndex
    """
    if not signature_header:
        return False
    
    salt_key = settings.PHONEPE_SALT_KEY
    salt_index = settings.PHONEPE_SALT_INDEX
    
    main_string = f"{response_b64}{salt_key}"
    sha256_hash = hashlib.sha256(main_string.encode('utf-8')).hexdigest()
    expected_signature = f"{sha256_hash}###{salt_index}"
    
    return hmac_compare(expected_signature, signature_header)

def hmac_compare(a: str, b: str) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0

def initiate_phonepe_payment(
    transaction_id: str,
    user_id: str,
    amount_paise: int,
    description: str,
    redirect_url: str
) -> Optional[Dict[str, Any]]:
    """
    Initiates payment request to PhonePe and returns the payment details (UPI QR Link or Redirect Page).
    """
    base_url = get_phonepe_base_url()
    endpoint = "/pg/v1/pay"
    url = f"{base_url}{endpoint}"
    
    # Construct PhonePe pay request payload
    payload = {
        "merchantId": settings.PHONEPE_MERCHANT_ID,
        "merchantTransactionId": transaction_id,
        "merchantUserId": user_id.replace("-", ""),  # Remove hyphens to keep alphanumeric
        "amount": amount_paise,
        "redirectUrl": redirect_url,
        "redirectMode": "REDIRECT",
        "callbackUrl": settings.PHONEPE_CALLBACK_URL,
        "paymentInstrument": {
            "type": "PAY_PAGE"  # Opens PhonePe checkout page showing QR + UPI Apps + Netbanking
        }
    }
    
    try:
        # Encode payload to base64
        payload_json = json.dumps(payload)
        payload_b64 = base64.b64encode(payload_json.encode('utf-8')).decode('utf-8')
        
        # Calculate X-VERIFY header
        checksum = calculate_phonepe_checksum(
            payload_b64=payload_b64,
            endpoint=endpoint,
            salt_key=settings.PHONEPE_SALT_KEY,
            salt_index=settings.PHONEPE_SALT_INDEX
        )
        
        headers = {
            "Content-Type": "application/json",
            "X-VERIFY": checksum
        }
        
        request_body = {
            "request": payload_b64
        }
        
        logger.info("Initiating PhonePe payment for txn: %s, amount: %d paise", transaction_id, amount_paise)
        response = requests.post(url, json=request_body, headers=headers, timeout=10)
        response_data = response.json()
        
        if response_data.get("success") is True:
            # Payment initiated successfully
            data = response_data.get("data", {})
            instrument_response = data.get("instrumentResponse", {})
            redirect_info = instrument_response.get("redirectInfo", {})
            
            return {
                "payment_url": redirect_info.get("url"),  # Redirect link to scan QR/pay
                "qr_payload": redirect_info.get("url") or "",
                "merchant_transaction_id": transaction_id
            }
        else:
            logger.error("PhonePe API failed: %s", response_data.get("message"))
            return None
            
    except Exception as exc:
        logger.error("Error initiating PhonePe payment: %s", exc, exc_info=True)
        return None

def query_phonepe_status(transaction_id: str) -> str:
    """
    Queries PhonePe check status API to determine transaction state.
    Returns: 'COMPLETED', 'FAILED', or 'PENDING'
    """
    base_url = get_phonepe_base_url()
    merchant_id = settings.PHONEPE_MERCHANT_ID
    endpoint = f"/pg/v1/status/{merchant_id}/{transaction_id}"
    url = f"{base_url}{endpoint}"
    
    checksum = calculate_phonepe_checksum(
        payload_b64="",
        endpoint=endpoint,
        salt_key=settings.PHONEPE_SALT_KEY,
        salt_index=settings.PHONEPE_SALT_INDEX
    )
    
    headers = {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": merchant_id
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response_data = response.json()
        
        if response_data.get("success") is True:
            code = response_data.get("code")
            if code == "PAYMENT_SUCCESS":
                return "COMPLETED"
            elif code in ["PAYMENT_ERROR", "PAYMENT_DECLINED", "TIMED_OUT"]:
                return "FAILED"
            else:
                return "PENDING"
        else:
            # If code is PAYMENT_PENDING, keep checking
            if response_data.get("code") == "PAYMENT_PENDING":
                return "PENDING"
            return "FAILED"
            
    except Exception as exc:
        logger.error("Error checking PhonePe status: %s", exc)
        return "PENDING"
