import base64
import json
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from pydantic import BaseModel
from services.auth_guard import get_current_user
from services.phonepe_service import verify_phonepe_webhook_signature
from services.payment_service import (
    create_checkout_intent,
    get_intent_status,
    process_webhook_notification
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

class CreateIntentRequest(BaseModel):
    plan_id: str
    redirect_url: str

class SimulatePaymentRequest(BaseModel):
    intent_id: str

@router.post("/checkout/create-intent")
def api_create_checkout_intent(
    body: CreateIntentRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Initiates payment intent via PhonePe Business PG.
    """
    user_id = current_user["user_id"]
    try:
        intent_info = create_checkout_intent(
            user_id=user_id,
            plan_id=body.plan_id,
            idempotency_key=idempotency_key,
            redirect_url=body.redirect_url
        )
        return intent_info
    except ValueError as val_err:
        logger.warning("Validation error on intent creation: %s", val_err)
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.error("Error creating checkout intent: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to initialize checkout session")

@router.get("/checkout/{intent_id}/status")
def api_get_checkout_status(
    intent_id: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Polls opaque status of a payment intent.
    """
    user_id = current_user["user_id"]
    try:
        status_info = get_intent_status(intent_id=intent_id, user_id=user_id)
        return status_info
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except Exception as exc:
        logger.error("Error checking intent status: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve payment status")

@router.post("/webhook/phonepe")
async def phonepe_webhook_callback(
    request: Request,
    x_verify: str = Header(..., alias="X-VERIFY")
) -> dict:
    """
    Receives secure server callback from PhonePe.
    Verifies X-VERIFY signature before handling.
    """
    try:
        body_bytes = await request.body()
        body_json = json.loads(body_bytes)
        response_b64 = body_json.get("response")
        
        if not response_b64:
            raise HTTPException(status_code=400, detail="Missing response payload")
            
        # 1. Verify PhonePe signature
        is_valid = verify_phonepe_webhook_signature(response_b64, x_verify)
        if not is_valid:
            logger.warning("Invalid PhonePe webhook signature callback rejected")
            raise HTTPException(status_code=401, detail="Webhook signature mismatch")
            
        # 2. Decode payload
        decoded_bytes = base64.b64decode(response_b64)
        payload = json.loads(decoded_bytes.decode('utf-8'))
        
        # 3. Process payment status updates
        logger.info("Verified PhonePe webhook callback received for response: %s", payload.get("code"))
        result = process_webhook_notification(payload)
        
        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("message"))
            
        return {"status": "ok"}
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error processing PhonePe webhook callback: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process payment callback")

@router.post("/checkout/simulate-success")
def api_simulate_payment_success(
    body: SimulatePaymentRequest,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    DEV ONLY: Simulates a successful PhonePe webhook callback.
    Allows testing the entire upgrade flow end-to-end locally.
    """
    user_id = current_user["user_id"]
    from services.database import _get_client
    supabase = _get_client()
    
    # Verify the intent belongs to this user and is PENDING
    intent_res = supabase.table("payment_intents").select("*").eq("id", body.intent_id).eq("user_id", user_id).execute()
    if not intent_res.data:
        raise HTTPException(status_code=404, detail="Payment intent not found")
        
    intent = intent_res.data[0]
    if intent["status"] != "PENDING":
        raise HTTPException(status_code=400, detail=f"Cannot simulate success on intent in status: {intent['status']}")
        
    # Build simulated PhonePe success payload
    simulated_payload = {
        "success": True,
        "code": "PAYMENT_SUCCESS",
        "data": {
            "merchantId": "PGMERCHANTXX",
            "merchantTransactionId": body.intent_id,
            "transactionId": f"SIM-{uuid.uuid4().hex[:12].upper()}",
            "amount": intent["amount_paise"],
            "state": "COMPLETED",
            "responseCode": "SUCCESS"
        }
    }
    
    # Process notifications
    logger.info("Simulating payment success webhook for intent: %s", body.intent_id)
    result = process_webhook_notification(simulated_payload)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
        
    return {"status": "success", "message": "Subscription upgraded successfully"}
