# Plan Purchase Flow — Complete Specification

> Stack: **Next.js (Frontend)** · **FastAPI (Backend)** · **PostgreSQL** · **Redis** · **Direct UPI (No Stripe/Razorpay)**

---

## 1. User Journey Overview

```
Pricing Page
  ↓ (click "Buy" on a plan)
Checkout Page (Secure Route)
  ├─ Display plan details
  ├─ Show UPI QR (2 min timer)
  ├─ Poll payment status
  └─ On COMPLETED → redirect to Pricing (highlight active plan)
```

---

## 2. All Purchase Scenarios & Edge Cases

### **Scenario 1: Happy Path — First Time Buyer**
```
User never bought a plan before
  ├─ Clicks "Buy" on Basic plan
  ├─ Navigated to: /checkout?plan_id=basic_monthly&session_id=xyz
  ├─ QR appears for 2 minutes
  ├─ Scans QR → UPI app opens → confirms payment
  ├─ Backend receives webhook (COMPLETED)
  ├─ Redirect to /pricing with "Basic ✓ Active" highlighted
  └─ Email: "Welcome! Your subscription is active"
```

### **Scenario 2: Upgrade — User Already Has Basic, Buys Pro**
```
Current: Basic (₹99/month)
Action: Click "Buy" on Pro plan (₹299/month)
  ├─ Checkout page shows: "Upgrade to Pro"
  ├─ Calculates pro-ration:
  │   ├─ Basic paid: ₹99, days remaining: 15
  │   ├─ Pro cost: ₹299, daily rate: ₹9.96/day
  │   ├─ Credit from Basic: ₹24.90 (2.5 days remaining × ₹9.96)
  │   └─ You pay: ₹299 - ₹24.90 = ₹274.10
  ├─ QR shown for upgraded amount (₹274.10)
  ├─ Payment confirmed
  ├─ Old subscription marked CANCELLED (with reason "Upgraded to Pro")
  ├─ New subscription created as ACTIVE
  └─ Redirect to /pricing showing "Pro ✓ Active" (with ₹299/month badge)
```

### **Scenario 3: Downgrade — User Has Pro, Buys Basic**
```
Current: Pro (₹299/month) - renewal in 10 days
Action: Click "Buy" on Basic plan (₹99/month)
  ├─ Checkout warns: "This is a DOWNGRADE"
  ├─ Calculates credit:
  │   ├─ Pro paid: ₹299, days remaining: 10
  │   ├─ Pro daily: ₹9.96/day → unused credit: ₹99.60
  │   ├─ Basic cost: ₹99
  │   └─ You get: ₹0.60 credit (₹99.60 - ₹99)
  ├─ QR shown: "Free (₹0)" — just acknowledge downgrade
  │   OR no payment needed, mark as DOWNGRADED
  ├─ Premium features disabled immediately
  │   (e.g., API limits dropped, advanced analytics removed)
  ├─ Redirect to /pricing showing "Basic ✓ Active"
  └─ Email: "Your plan has been downgraded"
```

### **Scenario 4: Same Plan Renewal — Basic expires today, user buys Basic again**
```
Current: Basic (expiring today)
Action: Click "Buy" on Basic plan again
  ├─ Checkout shows: "Renew your subscription"
  ├─ No upgrade/downgrade logic
  ├─ Amount: ₹99 (standard monthly)
  ├─ QR shown for ₹99
  ├─ Payment confirmed
  ├─ Old subscription marked EXPIRED
  ├─ New subscription created as ACTIVE (next 30 days)
  └─ Redirect to /pricing showing "Basic ✓ Active"
```

### **Scenario 5: Checkout Timeout — User didn't scan QR within 2 mins**
```
User lands on checkout page
  ├─ QR appears with 2:00 timer
  ├─ Timer reaches 0:00
  ├─ QR disappears
  ├─ Button changes: "QR Expired" → allow "Generate New QR"
  ├─ If user clicks "Generate New QR" → new QR appears for 2 mins
  ├─ Payment intent status: EXPIRED (in DB)
  ├─ User still on /checkout page
  └─ Can try again or go back
```

### **Scenario 6: QR Scanned But Payment Failed in UPI App**
```
User scans QR
  ├─ UPI app opens → user sees amount
  ├─ User clicks cancel/back button in UPI app
  ├─ UPI app closes
  ├─ Frontend still polling status
  ├─ Backend receives NO webhook (payment never initiated)
  ├─ After 2 mins, QR expires → "QR Expired" message
  ├─ User sees "Payment not completed" and "Generate New QR" button
  └─ User can retry
```

### **Scenario 7: Payment Initiated But Network Fails**
```
User scans QR → UPI app shows amount
  ├─ User confirms payment
  ├─ NPCI network fails mid-transaction
  ├─ UPI app shows error: "Transaction failed, retry?"
  ├─ No webhook received by backend
  ├─ Payment intent stays PROCESSING for 5 mins
  ├─ Reconciliation job checks: gateway says NO payment received
  ├─ Status marked FAILED (not COMPLETED)
  ├─ Frontend polling detects FAILED status
  ├─ User sees error: "Payment failed" + "Try Again" button
  └─ User can retry with new QR
```

### **Scenario 8: Duplicate Payment Protection — User clicks "Buy" twice**
```
User on /checkout?plan_id=basic_monthly&session_id=session1
  ├─ First click: idempotency_key = hash(session_id + plan_id + user_id)
  ├─ Backend creates payment_intent with idempotency_key
  ├─ QR appears
  ├─ User scans, pays ₹99 (webhook received, subscription created)
  ├─ But frontend is slow, user thinks payment failed
  ├─ User clicks "Try Again" button
  │   └─ Sends same idempotency_key again
  ├─ Backend returns 200 with SAME intent_id (idempotent)
  ├─ Frontend shows SAME QR as before
  ├─ Polling detects status: COMPLETED (already paid)
  ├─ Redirects to /pricing
  └─ NO double charge (Redis SETNX + DB UNIQUE saved us)
```

### **Scenario 9: Concurrent Requests — User clicks "Buy", then clicks "Upgrade"**
```
User on pricing page
  ├─ Clicks "Buy" on Basic → navigates to /checkout?plan_id=basic_monthly
  ├─ Page loading... user goes back & clicks "Buy" on Pro instead
  ├─ Browser cancels first request, creates new one: /checkout?plan_id=pro_monthly
  ├─ First checkout route still mounted (race condition)
  ├─ Session state conflict: which plan am I buying?
  ├─ Solution: use sessionStorage with timestamp
  │   └─ If query param ≠ sessionStorage plan, clear & reset
  └─ User sees correct plan (Pro) in checkout
```

### **Scenario 10: User Clicks Back Button During Checkout**
```
User on /checkout page
  ├─ Scanned QR, payment in progress (PROCESSING status)
  ├─ User clicks browser back button
  ├─ Navigated back to /pricing
  ├─ Polling stopped (cleanup in useEffect)
  ├─ Payment still pending in backend
  ├─ Reconciliation job runs every 2 mins
  │   └─ Checks with gateway, marks COMPLETED/FAILED
  ├─ If user refreshes /pricing after 2 mins, plan should be updated
  └─ Background job ensures consistency (no orphaned PROCESSING)
```

### **Scenario 11: Payment Completed, Webhook Received Twice**
```
Payer completes payment successfully
  ├─ Gateway sends webhook (first time): payment.captured
  ├─ Backend stores webhook_event with unique gateway_event_id
  ├─ Status: PENDING → COMPLETED
  ├─ Gateway retries webhook (network hiccup, needs confirmation)
  ├─ Second webhook received with same gateway_event_id
  ├─ Backend checks: webhook_events WHERE gateway_event_id = X
  │   └─ Already processed = TRUE
  ├─ Discards duplicate (idempotent webhook handler)
  └─ Subscription NOT created twice
```

### **Scenario 12: User Has Active Plan, Tries to Buy Same Plan Again**
```
User has: Basic (active, expires in 20 days)
Action: Clicks "Buy" on Basic plan again
  ├─ Checkout page logic detects: user already has same plan active
  ├─ Shows: "You already have this plan"
  ├─ Two options:
  │   ├─ "Renew Now" → pro-rate and create new subscription
  │   │   (current expires 20 days, new extends 30 more days)
  │   └─ "Go Back" → return to /pricing
  ├─ If "Renew Now": QR appears for pro-rated amount
  ├─ On completion: old subscription extended, not replaced
  └─ User sees continuous coverage
```

### **Scenario 13: Plan Features Changed Mid-Subscription**
```
User has: Basic plan (created 15 days ago, 15 days remaining)
Backend updates: Basic plan now includes API access (was Pro-only)
  ├─ User's subscription automatically gets new feature
  │   (features tied to plan_id, not to subscription record)
  ├─ User sees "Basic + API" in /pricing on next refresh
  └─ No payment needed (feature upgrade to plan)
```

### **Scenario 14: User Offline During QR Scan**
```
User on /checkout, WiFi on
  ├─ QR displayed, polling started
  ├─ User's internet disconnects
  ├─ User scans QR with phone (on mobile data)
  ├─ Payment goes through
  ├─ Backend receives webhook
  ├─ Frontend offline: polling failed
  ├─ User comes back online
  ├─ Frontend retries polling
  ├─ Status is COMPLETED (fetched from backend)
  ├─ Redirects to /pricing
  └─ Shows updated plan
```

### **Scenario 15: Free Plan to Paid Plan**
```
User has: Free plan (no subscription record, always active)
Action: Clicks "Buy" on Basic plan
  ├─ Checkout shows: "Upgrade from Free to Basic"
  ├─ No credit calculation (free has no cost)
  ├─ QR shown for ₹99
  ├─ Payment completed
  ├─ Free plan deactivated (if applicable)
  ├─ Paid subscription created
  ├─ Advanced features unlocked
  └─ Redirect to /pricing
```

### **Scenario 16: Annual vs Monthly Plan**
```
User on /pricing
  ├─ Toggle: "Monthly" / "Annual" pricing
  ├─ Plans switch: Basic ₹99/month ↔ ₹999/year (save 15%)
  ├─ User clicks "Buy" on Annual Basic (₹999/year)
  ├─ Checkout shows: "Basic Annual"
  ├─ QR for ₹999
  ├─ Payment completed
  ├─ Subscription created with billing_cycle = "ANNUAL"
  ├─ Renewal date set 365 days from now
  └─ /pricing shows renewal in 365 days (not 30)
```

### **Scenario 17: Subscription Grace Period (Payment Failed, But Feature Access Continues)**
```
User's subscription renews today
  ├─ Automatic renewal payment fails (UPI account insufficient funds)
  ├─ Backend marks subscription as PENDING_RENEWAL
  ├─ Features still accessible for 7 days (grace period)
  ├─ User sees notification: "Payment failed. Renew your plan"
  ├─ Link to manual renewal page
  ├─ User retries payment
  ├─ Payment succeeds
  ├─ Subscription marked ACTIVE
  ├─ After 7 days if no payment: subscription SUSPENDED, features disabled
  └─ User sees: "Plan expired. Renew to continue"
```

### **Scenario 18: Admin Changes User's Plan Manually**
```
Backend admin does: UPDATE subscriptions SET plan_id = 'pro_monthly' WHERE user_id = '...'
  ├─ User NOT charged again (admin action, not purchase)
  ├─ Audit log created: "Admin upgraded user to Pro"
  ├─ Email sent to user: "Your plan has been upgraded to Pro (complimentary)"
  ├─ User refreshes /pricing
  ├─ Sees "Pro ✓ Active" with note "Complimentary"
  └─ No payment required
```

---

## 3. Frontend Flow — Complete State Machine

```typescript
type CheckoutState = 
  | "LOADING"              // Initial load
  | "QR_GENERATED"         // QR visible, polling started
  | "QR_EXPIRED"           // 2 mins passed, QR gone
  | "PAYMENT_PROCESSING"   // Payment initiated in UPI app
  | "PAYMENT_COMPLETED"    // Webhook received, subscription created
  | "PAYMENT_FAILED"       // Webhook received failure status
  | "ERROR"                // Unexpected error
  | "REDIRECTING";         // Redirecting to /pricing
```

---

## 4. API Endpoints

### **4.1 Create Payment Intent for Plan Purchase**
```
POST /api/v1/checkout/create-intent
```

**Headers:**
```
Idempotency-Key: <uuid>        (MUST match user + plan combo)
Authorization: Bearer <token>
```

**Request:**
```json
{
  "plan_id": "basic_monthly",
  "current_subscription_id": "sub_xyz"  // optional, if upgrading/downgrading
}
```

**Response `201`:**
```json
{
  "checkout_session_id": "checkout_abc123",
  "intent_id": "intent_def456",
  "plan": {
    "id": "basic_monthly",
    "name": "Basic",
    "price": 99,
    "currency": "INR",
    "billing_cycle": "MONTHLY",
    "description": "Best for individuals"
  },
  "amount_to_pay": 99,
  "discount_applied": 0,
  "proration_credit": 0,
  "action_type": "NEW_PURCHASE",  // NEW_PURCHASE | UPGRADE | DOWNGRADE | RENEWAL
  "qr_code_base64": "data:image/png;base64,...",
  "upi_link": "upi://pay?pa=youremail@upi&pn=YourName&am=0.99&tn=BasicPlan&tr=intent_def456",
  "expires_at": "2026-06-11T10:30:00Z",
  "message": "Ready to pay"
}
```

---

### **4.2 Get Checkout Session Status**
```
GET /api/v1/checkout/{checkout_session_id}/status
```

**Response:**
```json
{
  "checkout_session_id": "checkout_abc123",
  "payment_status": "PENDING",  // PENDING | PROCESSING | COMPLETED | FAILED | EXPIRED
  "plan_id": "basic_monthly",
  "amount": 99,
  "completed_at": null
}
```

---

### **4.3 Get User's Current Subscription**
```
GET /api/v1/subscriptions/me/current
```

**Response:**
```json
{
  "subscription_id": "sub_xyz123",
  "plan_id": "basic_monthly",
  "plan": {
    "id": "basic_monthly",
    "name": "Basic",
    "price": 99,
    "features": ["API access", "10GB storage"]
  },
  "status": "ACTIVE",  // ACTIVE | PENDING_RENEWAL | CANCELLED | EXPIRED | SUSPENDED
  "created_at": "2026-05-11T10:00:00Z",
  "renews_at": "2026-06-11T10:00:00Z",
  "days_remaining": 30
}
```

---

### **4.4 Get All Available Plans**
```
GET /api/v1/plans?billing_cycle=MONTHLY
```

**Response:**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "features": ["5GB storage", "Community support"],
      "is_featured": false
    },
    {
      "id": "basic_monthly",
      "name": "Basic",
      "price": 99,
      "billing_cycle": "MONTHLY",
      "features": ["20GB storage", "API access", "Email support"],
      "is_featured": false
    },
    {
      "id": "pro_monthly",
      "name": "Pro",
      "price": 299,
      "billing_cycle": "MONTHLY",
      "features": ["Unlimited storage", "Advanced analytics", "Priority support"],
      "is_featured": true
    }
  ]
}
```

---

### **4.5 Validate Plan Purchase Before Checkout (Check Conflicts)**
```
POST /api/v1/checkout/validate
```

**Request:**
```json
{
  "plan_id": "basic_monthly"
}
```

**Response:**
```json
{
  "valid": true,
  "action_type": "NEW_PURCHASE",
  "message": "Ready to purchase",
  "conflicts": []
}
```

Or if downgrading with data overflow:
```json
{
  "valid": false,
  "action_type": "DOWNGRADE",
  "message": "Cannot downgrade — plan limits exceeded",
  "conflicts": [
    {
      "type": "STORAGE_EXCEEDED",
      "current_usage": 150,
      "plan_limit": 50,
      "required_action": "Delete 100 GB of data",
      "action_link": "/settings/storage"
    }
  ]
}
```

---

## 5. Database Schema (Extensions)

```sql
-- Plans table (static, updated by admin)
CREATE TABLE plans (
    id TEXT PRIMARY KEY,  -- "basic_monthly", "pro_annual"
    name VARCHAR NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency CHAR(3) DEFAULT 'INR',
    billing_cycle ENUM('MONTHLY', 'ANNUAL') NOT NULL,
    days_in_cycle INT NOT NULL,  -- 30 for monthly, 365 for annual
    features JSONB NOT NULL,     -- ["API access", "10GB storage"]
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table (user-specific)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id TEXT NOT NULL REFERENCES plans(id),
    payment_intent_id UUID,      -- link to payment_intents
    status ENUM(
        'ACTIVE',
        'PENDING_RENEWAL',
        'CANCELLED',
        'EXPIRED',
        'SUSPENDED'
    ) NOT NULL,
    billing_cycle ENUM('MONTHLY', 'ANNUAL') NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    renews_at TIMESTAMPTZ NOT NULL,  -- next renewal/expiry date
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by_user BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 0  -- optimistic lock
);

-- Plan purchases history (audit log)
CREATE TABLE plan_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_plan_id TEXT,           -- NULL if first purchase
    new_plan_id TEXT NOT NULL,
    payment_intent_id UUID NOT NULL,
    action_type ENUM(
        'NEW_PURCHASE',
        'UPGRADE', 
        'DOWNGRADE',
        'RENEWAL'
    ) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    proration_credit DECIMAL(10, 2) DEFAULT 0,
    status ENUM('COMPLETED', 'FAILED') NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend payment_intents table
ALTER TABLE payment_intents ADD COLUMN (
    payment_type ENUM('PLAN_PURCHASE', 'ONE_TIME') DEFAULT 'PLAN_PURCHASE',
    plan_id TEXT,
    user_id UUID
);
```

---

## 6. Frontend Component Structure (Next.js)

### **6.1 Pricing Page (`/pricing`)**
```
/pages/pricing.tsx
  ├─ Get all plans: GET /api/v1/plans
  ├─ Get user's current subscription: GET /api/v1/subscriptions/me/current
  ├─ Toggle: Monthly / Annual
  ├─ Render plan cards
  │   ├─ If free user: "Get Started" button
  │   ├─ If has subscription: "Current Plan ✓" or "Upgrade/Downgrade" button
  │   └─ "Buy" button for other plans
  └─ On "Buy" click → navigate to /checkout?plan_id=X&session_id=Y
```

### **6.2 Checkout Page (`/checkout`)**
```
/pages/checkout/[plan_id].tsx
  ├─ Extract plan_id from query params
  ├─ Load: POST /api/v1/checkout/create-intent
  ├─ Display:
  │   ├─ Plan details (name, price, features)
  │   ├─ QR code image (base64)
  │   ├─ 2-minute countdown timer
  │   ├─ "Copy UPI Link" button
  │   └─ "Generate New QR" button (if expired)
  ├─ Start polling: GET /api/v1/checkout/{session_id}/status
  │   ├─ Interval: 2 seconds
  │   ├─ On COMPLETED → useRouter.push('/pricing')
  │   ├─ On FAILED → show error, offer "Try Again"
  │   └─ On EXPIRED → show "QR Expired" + "Generate New QR"
  └─ Cleanup: useEffect return → stop polling, cancel requests
```

### **6.3 Hook: useCheckout**
```typescript
// hooks/useCheckout.ts
export function useCheckout(planId: string) {
  const [state, setState] = useState<CheckoutState>("LOADING");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [error, setError] = useState<string | null>(null);

  // 1. Create intent on mount
  useEffect(() => {
    const createIntent = async () => {
      const idempKey = getIdempotencyKey(planId);
      const res = await fetch('/api/v1/checkout/create-intent', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempKey },
        body: JSON.stringify({ plan_id: planId })
      });
      const data = await res.json();
      setQrCode(data.qr_code_base64);
      setPlan(data.plan);
      setState('QR_GENERATED');
    };
    createIntent().catch(err => {
      setState('ERROR');
      setError(err.message);
    });
  }, [planId]);

  // 2. Timer: 2 minutes
  useEffect(() => {
    if (state !== 'QR_GENERATED') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setState('QR_EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  // 3. Polling: status check
  useEffect(() => {
    if (state !== 'QR_GENERATED' && state !== 'PAYMENT_PROCESSING') return;

    const pollStatus = async () => {
      // ... fetch status
      if (status === 'COMPLETED') setState('PAYMENT_COMPLETED');
      if (status === 'FAILED') setState('PAYMENT_FAILED');
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [state]);

  return { state, qrCode, plan, timeLeft, error };
}
```

### **6.4 Checkout Component**
```typescript
// components/Checkout.tsx
export default function Checkout() {
  const router = useRouter();
  const { plan_id } = router.query;
  const { state, qrCode, plan, timeLeft, error } = useCheckout(plan_id as string);

  if (state === 'LOADING') return <LoadingSpinner />;
  if (state === 'ERROR') return <ErrorPage message={error} />;
  if (state === 'PAYMENT_COMPLETED') {
    setTimeout(() => router.push('/pricing'), 2000);
    return <SuccessPage />;
  }
  if (state === 'PAYMENT_FAILED') {
    return <FailurePage onRetry={() => router.reload()} />;
  }

  return (
    <div className="checkout-container">
      <div className="plan-summary">
        <h1>{plan?.name}</h1>
        <p className="price">₹{plan?.price}</p>
        <ul className="features">
          {plan?.features.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>

      {state === 'QR_GENERATED' && (
        <div className="qr-section">
          <img src={qrCode} alt="UPI QR" className="qr-image" />
          <div className="timer">
            <span className={`countdown ${timeLeft < 30 ? 'warning' : ''}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
            <p>Scan QR code to pay</p>
          </div>
          <button onClick={() => copyToClipboard(upiLink)}>
            📋 Copy UPI Link
          </button>
          <p className="text-sm">Can't scan? Click link above on your phone</p>
        </div>
      )}

      {state === 'QR_EXPIRED' && (
        <div className="expired-section">
          <p>QR code expired</p>
          <button onClick={() => router.reload()}>Generate New QR</button>
        </div>
      )}

      {state === 'PAYMENT_PROCESSING' && (
        <div className="processing-section">
          <Spinner />
          <p>Verifying payment...</p>
        </div>
      )}
    </div>
  );
}
```

---

## 7. Backend Implementation

### **7.1 Create Intent Endpoint**
```python
@router.post("/api/v1/checkout/create-intent")
async def create_checkout_intent(
    plan_id: str,
    current_subscription_id: Optional[str] = None,
    background_tasks: BackgroundTasks,
    db: Session,
    current_user: User
):
    """
    Create payment intent for plan purchase
    Handles: new purchase, upgrade, downgrade, renewal
    """
    
    # 1. Fetch plans
    new_plan = db.query(Plan).filter_by(id=plan_id).one_or_none()
    if not new_plan:
        raise HTTPException(404, detail="Plan not found")
    
    # 2. Get current subscription (if any)
    current_sub = db.query(Subscription)\
        .filter_by(user_id=current_user.id)\
        .filter_by(status='ACTIVE')\
        .one_or_none()
    
    # 3. Determine action type & calculate amount
    action_type = "NEW_PURCHASE"
    amount_to_pay = new_plan.price
    proration_credit = 0
    
    if current_sub:
        if current_sub.plan_id == plan_id:
            action_type = "RENEWAL"
        elif current_sub.plan.price < new_plan.price:
            action_type = "UPGRADE"
            proration_credit = calculate_proration(current_sub, new_plan)
            amount_to_pay = new_plan.price - proration_credit
        else:
            action_type = "DOWNGRADE"
            # Check for conflicts (e.g., storage overflow)
            conflicts = check_downgrade_conflicts(current_user, new_plan)
            if conflicts:
                raise HTTPException(
                    400, 
                    detail={
                        "action": "DOWNGRADE",
                        "conflicts": conflicts
                    }
                )
            # Calculate credit
            proration_credit = calculate_proration(current_sub, new_plan)
            amount_to_pay = max(0, new_plan.price - proration_credit)
    
    # 4. Create payment intent
    idempotency_key = create_idempotency_key(current_user.id, plan_id)
    payment_intent = PaymentIntent(
        id=uuid.uuid4(),
        user_id=current_user.id,
        plan_id=plan_id,
        amount_paise=int(amount_to_pay * 100),
        currency='INR',
        upi_vpa=UPI_VPA,
        description=f"Purchase: {new_plan.name}",
        status='PENDING',
        idempotency_key=idempotency_key,
        expires_at=datetime.now() + timedelta(minutes=2)
    )
    
    # UPI deep-link
    upi_link = generate_upi_link(
        vpa=UPI_VPA,
        payee_name=UPI_NAME,
        amount=amount_to_pay,
        description=f"Plan: {new_plan.name}",
        transaction_ref=str(payment_intent.id)
    )
    payment_intent.qr_payload = upi_link
    
    # Generate QR image
    qr_base64 = generate_upi_qr(upi_link)
    
    # Store in DB
    db.add(payment_intent)
    db.commit()
    
    # 5. Create checkout session (for tracking)
    checkout_session = CheckoutSession(
        id=uuid.uuid4(),
        user_id=current_user.id,
        payment_intent_id=payment_intent.id,
        plan_id=plan_id,
        action_type=action_type,
        status='PENDING'
    )
    db.add(checkout_session)
    db.commit()
    
    # 6. Schedule expiry cleanup
    background_tasks.add_task(
        expire_intent_after_delay,
        payment_intent.id,
        delay_seconds=120
    )
    
    return {
        "checkout_session_id": str(checkout_session.id),
        "intent_id": str(payment_intent.id),
        "plan": {
            "id": new_plan.id,
            "name": new_plan.name,
            "price": new_plan.price,
            "billing_cycle": new_plan.billing_cycle,
            "description": new_plan.description
        },
        "amount_to_pay": amount_to_pay,
        "proration_credit": proration_credit,
        "action_type": action_type,
        "qr_code_base64": qr_base64,
        "upi_link": upi_link,
        "expires_at": payment_intent.expires_at.isoformat(),
        "message": f"Ready to pay ₹{amount_to_pay}"
    }
```

### **7.2 Get Checkout Status**
```python
@router.get("/api/v1/checkout/{checkout_session_id}/status")
async def get_checkout_status(
    checkout_session_id: str,
    db: Session,
    current_user: User
):
    """Get real-time status of payment"""
    
    session = db.query(CheckoutSession)\
        .filter_by(id=checkout_session_id, user_id=current_user.id)\
        .one_or_none()
    
    if not session:
        raise HTTPException(404, detail="Checkout not found")
    
    intent = db.query(PaymentIntent)\
        .filter_by(id=session.payment_intent_id)\
        .one_or_none()
    
    return {
        "checkout_session_id": str(session.id),
        "payment_status": intent.status,  # PENDING | PROCESSING | COMPLETED | FAILED | EXPIRED
        "plan_id": session.plan_id,
        "amount": intent.amount_paise / 100,
        "completed_at": intent.completed_at
    }
```

### **7.3 Webhook Handler — Payment Confirmed**
```python
@router.post("/internal/webhooks/upi")
async def handle_upi_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session
):
    """
    Receive payment confirmation from NPCI UPI network
    Transaction Ref = payment_intent.id
    """
    
    body = await request.body()
    signature = request.headers.get('X-UPI-Signature')
    
    # 1. Verify signature
    if not verify_upi_webhook_signature(body, signature):
        raise HTTPException(401, detail="Invalid signature")
    
    payload = json.loads(body)
    
    # 2. Store raw webhook event (idempotent)
    webhook_event = WebhookEvent(
        id=uuid.uuid4(),
        provider='UPI_NETWORK',
        gateway_event_id=payload.get('utr'),  # Unique Transaction Reference
        raw_payload=payload,
        signature=signature,
        processed=False
    )
    db.add(webhook_event)
    db.commit()
    
    # 3. Check if already processed
    existing = db.query(WebhookEvent)\
        .filter_by(gateway_event_id=webhook_event.gateway_event_id, processed=True)\
        .one_or_none()
    
    if existing:
        return {"status": "already_processed"}
    
    # 4. Extract transaction ref → find payment intent
    txn_ref = payload.get('tr')  # transaction reference (our payment_intent.id)
    payment_intent = db.query(PaymentIntent)\
        .filter_by(id=txn_ref)\
        .one_or_none()
    
    if not payment_intent:
        webhook_event.processed = True
        db.commit()
        return {"status": "intent_not_found"}  # Orphaned payment
    
    # 5. Update payment intent status
    if payload.get('status') == 'SUCCESS':
        payment_intent.status = 'COMPLETED'
        payment_intent.gateway_ref = txn_ref
        payment_intent.completed_at = datetime.now()
        payment_intent.version += 1
        
        # 6. Create subscription
        checkout_session = db.query(CheckoutSession)\
            .filter_by(payment_intent_id=payment_intent.id)\
            .one()
        
        # Cancel old subscription if upgrading/downgrading
        if checkout_session.action_type in ['UPGRADE', 'DOWNGRADE', 'RENEWAL']:
            old_sub = db.query(Subscription)\
                .filter_by(user_id=payment_intent.user_id, status='ACTIVE')\
                .one_or_none()
            if old_sub:
                old_sub.status = 'CANCELLED'
                old_sub.cancelled_at = datetime.now()
                old_sub.cancellation_reason = f"User upgraded/downgraded to {checkout_session.plan_id}"
        
        # Create new subscription
        new_subscription = Subscription(
            id=uuid.uuid4(),
            user_id=payment_intent.user_id,
            plan_id=checkout_session.plan_id,
            payment_intent_id=payment_intent.id,
            status='ACTIVE',
            billing_cycle=new_plan.billing_cycle,
            auto_renew=True,
            created_at=datetime.now(),
            renews_at=datetime.now() + timedelta(days=new_plan.days_in_cycle)
        )
        db.add(new_subscription)
        
        # Record purchase history
        purchase = PlanPurchase(
            id=uuid.uuid4(),
            user_id=payment_intent.user_id,
            old_plan_id=checkout_session.old_plan_id,
            new_plan_id=checkout_session.plan_id,
            payment_intent_id=payment_intent.id,
            action_type=checkout_session.action_type,
            amount_paid=payment_intent.amount_paise / 100,
            status='COMPLETED',
            completed_at=datetime.now()
        )
        db.add(purchase)
        
        # Send confirmation email
        background_tasks.add_task(
            send_purchase_confirmation_email,
            user_id=payment_intent.user_id,
            plan_id=checkout_session.plan_id
        )
    
    else:
        # Payment failed
        payment_intent.status = 'FAILED'
    
    webhook_event.processed = True
    db.commit()
    
    return {"status": "processed"}
```

---

## 8. Edge Cases & Handling

| Edge Case | Frontend Handling | Backend Handling |
|-----------|------------------|-----------------|
| QR expires after 2 min | Show "QR Expired" button, allow retry | Auto-expire intent in DB, mark EXPIRED |
| Payment fails mid-transaction | Poll detects FAILED, show error | Webhook receives failure, marks FAILED |
| Duplicate webhook | Not applicable | Check `gateway_event_id`, skip if already `processed=TRUE` |
| User clicks back | Stop polling cleanup | Background job reconciles on next cron |
| Concurrent upgrades | Session state conflict → reset | DB unique constraint or optimistic lock prevents double-charge |
| Offline during payment | Retry polling on reconnect | Polling will eventually fetch real status |
| Server crashes | Frontend keeps polling | Reconciliation job catches orphaned PROCESSING intents |
| Webhook never arrives | Frontend polling detects timeout | Manual reconciliation job calls gateway API |

---

## 9. Frontend Components Checklist

```typescript
// components/CheckoutPage.tsx
- Plan summary display ✓
- QR image render ✓
- Countdown timer (2:00) ✓
- "Copy UPI Link" button ✓
- Polling logic + status display ✓
- Error states + retry UI ✓
- Loading states ✓

// components/PricingPage.tsx
- Plan cards (Free, Basic, Pro) ✓
- Toggle: Monthly / Annual ✓
- "Current Plan ✓" badge ✓
- "Buy" / "Upgrade" / "Downgrade" buttons ✓
- On mount: fetch current subscription ✓

// hooks/useCheckout.ts
- Intent creation ✓
- QR timer (120 sec) ✓
- Status polling (2 sec interval) ✓
- Cleanup on unmount ✓
```

---

## 10. Security Checklist

| Security Measure | Implementation |
|---|---|
| **No double charge** | Redis SETNX + DB UNIQUE(idempotency_key) |
| **No tampering with amount** | QR generated server-side, links to intent_id |
| **No PII in URL** | Session ID + intent ID are opaque UUIDs |
| **Webhook verification** | HMAC-SHA256 signature check |
| **Idempotent webhooks** | Store `gateway_event_id`, check if `processed=TRUE` |
| **Atomic subscriptions** | Use DB transaction for intent + subscription creation |
| **Rate limiting** | Per-user limit on checkout creation (10 per hour) |
| **No client trust** | Subscription status only updated via verified webhook |
| **Grace period on renewal fail** | Allow 7-day access before suspension |
