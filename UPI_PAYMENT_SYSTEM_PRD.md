# UPI Payment System — PRD & Implementation Guide

> Stack: **Next.js (Frontend)** · **FastAPI (Backend)** · **PostgreSQL** · **Redis** · **UPI Deep-link / QR**

---

## 1. Product Overview

A secure, idempotent UPI payment collection flow where:
1. Your website generates a **UPI QR code** scoped to a specific payment intent.
2. A payer scans the QR on their UPI app (GPay / PhonePe / Paytm / BHIM etc.).
3. Payment status is **verified via a payment gateway webhook + polling**, never trusted from the client.
4. Funds are only marked "received" when the gateway confirms a successful credit to **your VPA (Virtual Payment Address / UPI ID)**.

---

## 2. Core Requirements

### 2.1 Functional
| # | Requirement |
|---|-------------|
| F1 | Generate a unique, expiring UPI QR code per payment intent |
| F2 | Accept amount, description, and optional payer metadata |
| F3 | Mark payment `COMPLETED` only on verified gateway credit confirmation |
| F4 | Automatically expire / cancel unpaid intents after TTL |
| F5 | Expose a status-polling endpoint for the frontend |
| F6 | Send a webhook from gateway → backend for real-time confirmation |

### 2.2 Non-Functional / Security
| # | Requirement |
|---|-------------|
| S1 | **Idempotency** — duplicate payment attempts are rejected (dedup key per intent) |
| S2 | **Rate limiting** — per-IP and per-user on QR generation and status endpoints |
| S3 | **No client trust** — payment status is never set based on frontend input |
| S4 | **Atomic DB writes** — status transitions use DB-level locks / optimistic concurrency |
| S5 | **Webhook signature verification** — all gateway callbacks validated with HMAC |
| S6 | **Privacy** — payment intent IDs are opaque UUIDs; no PII in QR URL params |
| S7 | **Short-lived QR** — QR codes expire (default 10 min), after which intent is `CANCELLED` |
| S8 | **Crash safety** — if server restarts mid-flow, a background job reconciles pending intents |

---

## 3. Entities & Data Model

```sql
-- PostgreSQL

CREATE TYPE payment_status AS ENUM (
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'
);

CREATE TABLE payment_intents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_paise    BIGINT NOT NULL,               -- always store in smallest unit
  currency        CHAR(3) NOT NULL DEFAULT 'INR',
  upi_vpa         TEXT NOT NULL,                 -- your UPI ID
  description     TEXT,
  status          payment_status NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT UNIQUE NOT NULL,          -- caller-supplied dedup key
  qr_payload      TEXT NOT NULL,                 -- UPI deep-link string
  gateway_ref     TEXT,                          -- gateway's transaction ID
  payer_vpa       TEXT,                          -- filled on completion
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,          -- created_at + TTL
  completed_at    TIMESTAMPTZ,
  version         INT NOT NULL DEFAULT 0         -- optimistic lock
);

CREATE INDEX ON payment_intents (status, expires_at);
CREATE INDEX ON payment_intents (gateway_ref);

CREATE TABLE webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL,
  raw_payload     JSONB NOT NULL,
  signature       TEXT NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. API Design (FastAPI)

### 4.1 Create Payment Intent
```
POST /api/v1/payments/intent
```
**Headers:** `Idempotency-Key: <uuid>` (required)

**Request body:**
```json
{
  "amount_paise": 50000,
  "description": "Order #1234",
  "payer_name": "optional"
}
```

**Response `201`:**
```json
{
  "intent_id": "8f4a...",
  "qr_image_base64": "data:image/png;base64,...",
  "upi_link": "upi://pay?pa=you@upi&pn=YourName&am=500.00&tn=Order%201234&tr=8f4a...",
  "expires_at": "2025-06-11T10:20:00Z",
  "amount_paise": 50000
}
```

**Rate limit:** 10 requests / minute / IP · 30 requests / hour / authenticated user

---

### 4.2 Get Payment Status
```
GET /api/v1/payments/intent/{intent_id}/status
```
**Response:**
```json
{
  "intent_id": "8f4a...",
  "status": "PENDING",          // PENDING | PROCESSING | COMPLETED | FAILED | EXPIRED
  "amount_paise": 50000,
  "completed_at": null
}
```

**Rate limit:** 60 requests / minute / IP (used by frontend poller)

> ⚠️ This endpoint returns **no PII** — no payer VPA, no gateway ref. Those stay server-side.

---

### 4.3 Gateway Webhook (internal, not exposed to payers)
```
POST /internal/webhooks/upi
```
- Protected by **HMAC-SHA256 signature** in `X-Gateway-Signature` header.
- Raw body is stored first (idempotent raw storage), then processed.
- Never exposed via public DNS — sits behind an internal route or IP allowlist.

---

### 4.4 Admin Reconcile (cron-triggered)
```
POST /internal/jobs/reconcile-expired
```
- Moves all `PENDING` intents past `expires_at` → `EXPIRED`.
- Calls gateway refund API if `PROCESSING` intents have been stuck > threshold.

---

## 5. Security Architecture

### 5.1 No Double Payment (Idempotency)
```
Client sends Idempotency-Key header
  │
  ▼
Redis SETNX idempotency:{key} intent_id  TTL=24h
  │
  ├─ Key already exists → return cached 201 response (no new intent created)
  └─ New key → create intent, cache response
```

At DB level, `idempotency_key` column has a `UNIQUE` constraint as a hard backstop.

### 5.2 Atomic Status Transitions (Optimistic Locking)
```sql
UPDATE payment_intents
SET    status = 'COMPLETED',
       gateway_ref = $1,
       payer_vpa = $2,
       completed_at = NOW(),
       version = version + 1
WHERE  id = $3
  AND  status = 'PENDING'          -- only from this state
  AND  version = $4;               -- optimistic lock check

-- If 0 rows updated → concurrent update won, discard this one
```

### 5.3 Rate Limiting (Redis Token Bucket)
```
QR Generation:    10 req/min  per IP  (sliding window in Redis)
Status Poll:      60 req/min  per IP
Webhook:          500 req/min per gateway IP (allowlisted range only)
```

FastAPI middleware using `slowapi` (wraps `limits` library with Redis backend).

### 5.4 Webhook Signature Verification
```python
import hmac, hashlib

def verify_webhook(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

Webhook handler:
1. **Store raw event first** (idempotent, keyed on gateway event ID).
2. Verify signature — reject `400` if invalid.
3. Check `processed = FALSE` — skip if already handled.
4. Apply DB transition.
5. Mark `processed = TRUE`.

### 5.5 Privacy / Obfuscation
- Intent IDs are random UUIDs — non-guessable.
- QR code contains only the standard UPI deep-link — no internal IDs visible to the payer.
- The `tr=` (transaction reference) field in UPI deep-link uses the intent UUID, which is opaque.
- Status endpoint returns **only** the minimum fields needed for UI display.
- No payment metadata (amount, description) logged in access logs.

### 5.6 Crash Recovery
A background job runs every 2 minutes:
```
SELECT * FROM payment_intents
WHERE status IN ('PENDING', 'PROCESSING')
  AND expires_at < NOW();

→ For each: call gateway API to check actual status
→ Reconcile DB state from gateway truth
→ Emit EXPIRED/COMPLETED/FAILED event accordingly
```

---

## 6. UPI QR Generation

UPI QR codes follow the **BharatQR / NPCI UPI deep-link spec**:

```
upi://pay?
  pa=yourname@okicici         ← your VPA (UPI ID)
  &pn=Your+Display+Name       ← your name
  &am=500.00                  ← amount in INR (decimal)
  &cu=INR
  &tn=Order+1234              ← description (max 50 chars)
  &tr=<intent_uuid>           ← transaction reference (your intent ID)
```

Generate QR image server-side using `qrcode` (Python):
```python
import qrcode, base64
from io import BytesIO

def generate_upi_qr(upi_link: str) -> str:
    img = qrcode.make(upi_link)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()
```

Return as base64 PNG — never stored permanently, always regeneratable from the intent record.

---

## 7. Frontend Flow (Next.js)

### 7.1 Page Flow
```
/checkout
  │
  ├─ User clicks "Pay via UPI"
  ├─ POST /api/v1/payments/intent  (with Idempotency-Key from sessionStorage)
  ├─ Display QR image + UPI deep-link button (mobile)
  ├─ Start polling: GET /status every 3s (max 10 min)
  │    ├─ PENDING  → keep showing QR
  │    ├─ COMPLETED → redirect to /payment/success
  │    ├─ EXPIRED/FAILED → show error, offer retry
  │    └─ CANCELLED → show cancellation message
  └─ On page unload → stop polling (don't cancel — let server-side TTL handle it)
```

### 7.2 Idempotency Key Generation (Client)
```typescript
// Generate once per checkout session, persist in sessionStorage
function getOrCreateIdempotencyKey(orderId: string): string {
  const storageKey = `idem_${orderId}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const key = `${orderId}_${crypto.randomUUID()}`;
  sessionStorage.setItem(storageKey, key);
  return key;
}
```

### 7.3 Polling with Exponential Backoff
```typescript
async function pollPaymentStatus(intentId: string, onStatus: (s: string) => void) {
  let interval = 3000;
  const maxTime = 10 * 60 * 1000;
  const start = Date.now();

  while (Date.now() - start < maxTime) {
    const res = await fetch(`/api/v1/payments/intent/${intentId}/status`);
    const { status } = await res.json();
    onStatus(status);
    if (['COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(status)) break;
    await new Promise(r => setTimeout(r, interval));
    interval = Math.min(interval * 1.2, 10000); // slow down over time
  }
}
```

---

## 8. Infrastructure & Deployment

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js on Vercel / self-hosted |
| Backend API | FastAPI on Railway / EC2 / Fly.io |
| Database | PostgreSQL (Supabase / RDS) |
| Cache / Rate limit | Redis (Upstash / ElastiCache) |
| Background jobs | APScheduler (in-process) or Celery Beat |
| Gateway | Razorpay / Cashfree / PayU (UPI collect flow) |
| Secrets | Doppler / AWS Secrets Manager |
| Monitoring | Sentry (errors) + Prometheus/Grafana (latency) |

---

## 9. Gateway Integration Notes

> Recommended: **Razorpay** or **Cashfree** — both support UPI QR generation natively and provide webhooks with HMAC signatures.

With Razorpay:
- Create a `Payment Link` or `QR Code` via their API tied to your account VPA.
- They handle the UPI collect / push internally.
- Webhook event: `payment.captured` → mark intent `COMPLETED`.
- Webhook event: `payment.failed` → mark intent `FAILED`.

Without a gateway (pure NPCI UPI):
- You generate the QR yourself (using the deep-link format above).
- You **must** use a bank's UPI API (via nodal account) or a PSP to receive webhooks on credit.
- Not recommended for production — use a gateway.

---

## 10. Environment Variables

```env
# FastAPI .env
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
REDIS_URL=redis://localhost:6379/0
UPI_VPA=yourname@okicici
UPI_DISPLAY_NAME=Your Name
PAYMENT_INTENT_TTL_SECONDS=600
GATEWAY_WEBHOOK_SECRET=<hmac-secret-from-gateway>
GATEWAY_API_KEY=<gateway-key>
GATEWAY_API_SECRET=<gateway-secret>
INTERNAL_JOB_SECRET=<random-secret-for-cron-endpoint>
ALLOWED_WEBHOOK_IPS=x.x.x.x,y.y.y.y   # gateway IP range
```

---

## 11. Implementation Checklist

### Phase 1 — Core Flow
- [ ] FastAPI project scaffold with async SQLAlchemy + Alembic
- [ ] `payment_intents` and `webhook_events` tables + migrations
- [ ] `POST /intent` with idempotency (Redis SETNX + DB unique constraint)
- [ ] QR generation endpoint returning base64 PNG
- [ ] `GET /status` endpoint (no PII leakage)
- [ ] TTL expiry via background job (APScheduler)

### Phase 2 — Security & Reliability
- [ ] Rate limiting middleware (slowapi + Redis)
- [ ] Webhook ingestion with HMAC verification
- [ ] Optimistic locking on status transitions
- [ ] Crash-recovery reconciliation job
- [ ] IP allowlist for webhook route

### Phase 3 — Frontend
- [ ] Next.js checkout page with QR display
- [ ] Idempotency key management in sessionStorage
- [ ] Polling with exponential backoff + terminal state handling
- [ ] Success / failure / expired pages
- [ ] Mobile deep-link button (`upi://pay?...`)

### Phase 4 — Ops
- [ ] Sentry error tracking (both Next + FastAPI)
- [ ] Structured logging (no PII in logs)
- [ ] Prometheus metrics: intent creation rate, completion rate, webhook latency
- [ ] Alerting on stuck `PROCESSING` intents > 5 min

---

## 12. Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Status source of truth | Gateway webhook only | Client can never lie about payment |
| QR generation | Server-side | Prevents tampering of amount/VPA |
| Idempotency | Redis + DB UNIQUE | Two-layer: fast check + hard backstop |
| Status transitions | Optimistic locking | Prevents race conditions on concurrent webhooks |
| Privacy | Opaque UUIDs, no PII in URLs | Payer cannot enumerate or track intents |
| Expiry | Server-side TTL + background job | Works even if client disconnects |
| Double payment | One intent per idempotency key | Same order can never create two charges |
