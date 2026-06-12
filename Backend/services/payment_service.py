import logging
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from services.database import _get_client
from services.phonepe_service import initiate_phonepe_payment, query_phonepe_status

logger = logging.getLogger(__name__)

# Static definition of plans
PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price_inr": 0,
        "emails_limit": 25,
        "billing_cycle": "MONTHLY"
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price_inr": 399,
        "emails_limit": 500,
        "billing_cycle": "MONTHLY"
    },
    "pro_yearly": {
        "id": "pro",
        "name": "Pro Yearly",
        "price_inr": 4309,
        "emails_limit": 500,
        "billing_cycle": "YEARLY"
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "price_inr": 899,
        "emails_limit": 1500,
        "billing_cycle": "MONTHLY"
    },
    "enterprise_yearly": {
        "id": "enterprise",
        "name": "Enterprise Yearly",
        "price_inr": 9709,
        "emails_limit": 1500,
        "billing_cycle": "YEARLY"
    }
}

def create_checkout_intent(user_id: str, plan_id: str, idempotency_key: str, redirect_url: str) -> Dict[str, Any]:
    """
    Creates a payment intent for purchasing a plan.
    Initiates payment via PhonePe PG.
    """
    plan = PLANS.get(plan_id.lower())
    if not plan:
        raise ValueError("Invalid plan selected")
    
    amount_inr = plan["price_inr"]
    if amount_inr <= 0:
        # Free plan does not need checkout flow
        raise ValueError("Free plan does not require a payment flow")
        
    amount_paise = amount_inr * 100
    
    supabase = _get_client()
    
    # 1. Check if intent with this idempotency key already exists to prevent duplicate intents
    existing_intent = supabase.table("payment_intents").select("*").eq("idempotency_key", idempotency_key).execute()
    if existing_intent.data:
        intent = existing_intent.data[0]
        # Check if expired
        expires_at = datetime.fromisoformat(intent["expires_at"].replace("Z", "+00:00"))
        if intent["status"] == "PENDING" and expires_at < datetime.now(expires_at.tzinfo):
            # Expire it and create a new one
            supabase.table("payment_intents").update({"status": "EXPIRED"}).eq("id", intent["id"]).execute()
        else:
            return {
                "intent_id": intent["id"],
                "amount": intent["amount_paise"] / 100,
                "qr_payload": intent["qr_payload"],
                "status": intent["status"],
                "expires_at": intent["expires_at"],
                "plan_id": intent["plan_id"]
            }
            
    # 2. Generate a new payment intent UUID
    intent_id = str(uuid.uuid4())
    expires_at = (datetime.now() + timedelta(minutes=2)).isoformat()
    
    # 3. Call PhonePe API to initiate pay page / QR
    payment_initiation = initiate_phonepe_payment(
        transaction_id=intent_id,
        user_id=user_id,
        amount_paise=amount_paise,
        description=f"AI Mail Support: {plan['name']} Plan",
        redirect_url=redirect_url
    )
    
    if not payment_initiation:
        raise RuntimeError("Failed to initiate payment transaction with PhonePe")
        
    qr_payload = payment_initiation["payment_url"]
    
    # 4. Insert payment intent record in database
    new_intent = {
        "id": intent_id,
        "amount_paise": amount_paise,
        "currency": "INR",
        "status": "PENDING",
        "idempotency_key": idempotency_key,
        "qr_payload": qr_payload,
        "gateway_ref": intent_id,
        "user_id": user_id,
        "plan_id": plan_id,
        "expires_at": expires_at
    }
    
    result = supabase.table("payment_intents").insert(new_intent).execute()
    if not result.data:
        raise RuntimeError("Database error creating payment intent")
        
    return {
        "intent_id": intent_id,
        "amount": amount_inr,
        "qr_payload": qr_payload,
        "status": "PENDING",
        "expires_at": expires_at,
        "plan_id": plan_id
    }

def get_intent_status(intent_id: str, user_id: str) -> Dict[str, Any]:
    """
    Get opaque status of a payment intent.
    """
    supabase = _get_client()
    result = supabase.table("payment_intents").select("id, status, plan_id, amount_paise, expires_at").eq("id", intent_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise ValueError("Payment intent not found")
        
    intent = result.data[0]
    
    # Check if PENDING intent is expired based on current time
    if intent["status"] == "PENDING":
        expires_at_str = intent["expires_at"].replace("Z", "+00:00")
        expires_at = datetime.fromisoformat(expires_at_str)
        if expires_at < datetime.now(expires_at.tzinfo):
            # Mark as expired in DB
            supabase.table("payment_intents").update({"status": "EXPIRED"}).eq("id", intent_id).execute()
            intent["status"] = "EXPIRED"
            
    return {
        "intent_id": intent["id"],
        "status": intent["status"],
        "plan_id": intent["plan_id"],
        "amount": intent["amount_paise"] / 100
    }

def process_webhook_notification(payload: Dict[str, Any], provider: str = "PHONEPE") -> Dict[str, Any]:
    """
    Process payment gateway callback/webhook.
    Updates the payment intent status and changes the user subscription if successful.
    """
    # Extract transaction fields
    data = payload.get("data", {}) if isinstance(payload.get("data"), dict) else {}
    merchant_txn_id = data.get("merchantTransactionId") or payload.get("merchantTransactionId")
    success = payload.get("success", False)
    code = payload.get("code")
    amount = data.get("amount") or payload.get("amount") # in paise
    provider_ref = data.get("transactionId") or payload.get("providerReference")
    
    if not merchant_txn_id:
        return {"status": "error", "message": "Missing merchantTransactionId"}
        
    supabase = _get_client()
    
    # 1. Fetch payment intent
    intent_res = supabase.table("payment_intents").select("*").eq("id", merchant_txn_id).execute()
    if not intent_res.data:
        return {"status": "error", "message": f"Payment intent {merchant_txn_id} not found"}
        
    intent = intent_res.data[0]
    
    # Check if already completed/finalized to avoid reprocessing
    if intent["status"] in ["COMPLETED", "FAILED"]:
        return {"status": "success", "message": f"Transaction already finalized as {intent['status']}"}
        
    # Check status transitions
    if success and code == "PAYMENT_SUCCESS":
        new_status = "COMPLETED"
    else:
        new_status = "FAILED"
        
    # 2. Update payment intent atomically using version concurrency lock
    update_res = supabase.table("payment_intents").update({
        "status": new_status,
        "provider_ref": provider_ref,
        "completed_at": datetime.now().isoformat(),
        "version": intent["version"] + 1
    }).eq("id", merchant_txn_id).eq("version", intent["version"]).execute()
    
    if not update_res.data:
        # Atomic lock mismatch, discard this request
        return {"status": "error", "message": "Concurrent updates detected on payment intent"}
        
    # 3. If completed, provision the subscription upgrade
    if new_status == "COMPLETED":
        user_id = intent["user_id"]
        plan_id = intent["plan_id"]
        plan = PLANS.get(plan_id.lower())
        
        if plan:
            # Update user subscription
            # Check if user already has a subscription
            sub_res = supabase.table("subscriptions").select("*").eq("user_id", user_id).execute()
            
            old_plan_id = None
            if plan["billing_cycle"] == "YEARLY":
                expires_delta = timedelta(days=365)
            else:
                expires_delta = timedelta(days=30)
            
            new_sub_data = {
                "user_id": user_id,
                "tier": plan["id"],
                "emails_limit": plan["emails_limit"],
                "emails_used": 0, # Reset usage for new billing cycle
                "status": "active",
                "payment_intent_id": merchant_txn_id,
                "billing_cycle": plan["billing_cycle"],
                "renews_at": (datetime.now() + expires_delta).isoformat(),
                "period_start": datetime.now().isoformat(),
                "period_end": (datetime.now() + expires_delta).isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            if sub_res.data:
                # Update existing subscription
                old_sub = sub_res.data[0]
                old_plan_id = old_sub.get("tier", "free")
                supabase.table("subscriptions").update(new_sub_data).eq("user_id", user_id).execute()
            else:
                # Create subscription
                supabase.table("subscriptions").insert(new_sub_data).execute()
                
            # Log purchase history
            purchase_log = {
                "user_id": user_id,
                "old_plan_id": old_plan_id,
                "new_plan_id": plan["id"],
                "payment_intent_id": merchant_txn_id,
                "action_type": "NEW_PURCHASE" if (not old_plan_id or old_plan_id == "free") else "UPGRADE",
                "amount_paid": amount / 100.0,
                "status": "COMPLETED",
                "completed_at": datetime.now().isoformat()
            }
            supabase.table("plan_purchases").insert(purchase_log).execute()
            logger.info("Successfully provisioned subscription for user %s: Tier %s", user_id, plan["id"])
            
    return {"status": "success", "message": f"Processed callback with status {new_status}"}

def reconcile_stuck_pending_payments() -> int:
    """
    Cron job function to check with PhonePe on payments stuck in PENDING status.
    Returns the count of resolved payments.
    """
    supabase = _get_client()
    # Find all PENDING intents created more than 2 minutes ago
    two_minutes_ago = (datetime.now() - timedelta(minutes=2)).isoformat()
    stuck_intents = supabase.table("payment_intents").select("*").eq("status", "PENDING").lt("created_at", two_minutes_ago).execute()
    
    resolved_count = 0
    
    for intent in stuck_intents.data:
        intent_id = intent["id"]
        # Query PhonePe check status API
        current_state = query_phonepe_status(intent_id)
        
        if current_state in ["COMPLETED", "FAILED"]:
            # Mock the payload as if we got a callback
            mock_callback_payload = {
                "merchantTransactionId": intent_id,
                "success": current_state == "COMPLETED",
                "code": "PAYMENT_SUCCESS" if current_state == "COMPLETED" else "PAYMENT_ERROR",
                "amount": intent["amount_paise"],
                "providerReference": "RECONCILED"
            }
            process_webhook_notification(mock_callback_payload)
            resolved_count += 1
            
        else:
            # If still pending after 10 minutes, mark as EXPIRED
            created_at_str = intent["created_at"].replace("Z", "+00:00")
            created_at = datetime.fromisoformat(created_at_str)
            if created_at < datetime.now(created_at.tzinfo) - timedelta(minutes=10):
                supabase.table("payment_intents").update({"status": "EXPIRED"}).eq("id", intent_id).execute()
                resolved_count += 1
                
    return resolved_count
