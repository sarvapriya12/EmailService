# Email AI Service — Next Steps & Roadmap

---

## Problems Already Fixed

| # | Problem | Fix Applied |
|---|---------|-------------|
| 5 | Router throws RuntimeError when all providers fail | Returns graceful fallback response instead of crashing |
| 6 | No graceful fallback | Fallback string returned when all LLMs fail |
| 7 | Webhook returns 503 | /gmail/push now always returns 200 |
| 8 | Infinite Pub/Sub retry loop | 200 response stops Google from retrying |
| 1 | No new messages treated as failure | Returns `no_new_messages` status instead of `failed` |
| 11, 12 | Duplicate emails & idempotency | Fixed via Supabase `processed_messages` locks |
| 2, 3, 4, 9 | LLM Rate Limits & Quotas | Fixed via `PoolRouter` round-robin & fallback |
| 10 | Context Limits / Prompts too large | Fixed via `email-reply-parser` thread pruning & truncation |

---

## Next Steps — In Order

---

### Step 1 — Celery + Redis Task Queue
**Priority: P2**
**Solves: Concurrency, retry logic, background processing**

**What it solves:**
- Multiple emails processed simultaneously without blocking
- Retries with exponential backoff instead of Pub/Sub retries
- API returns immediately — no more waiting 10 seconds per request
- Dead letter queue for permanently failed emails

**How it changes the API:**
```
Before (synchronous):
POST /process-email → wait 5-10 seconds → return EmailResponse

After (asynchronous):
POST /process-email → return task_id immediately (202 Accepted)
GET /task/{task_id} → return result when ready
```

**Celery chain per request:**
```
classify.s(email) | extract.s() | generate.s() | send.s()
```
Each step waits for the previous — order is always preserved.

**What gets built:**
- Redis on Render (or Supabase alternative)
- Celery worker setup
- Task chain for email pipeline
- Dead letter queue for failed tasks
- `GET /task/{task_id}` endpoint

---

### Step 2 — Per-User Gmail OAuth
**Priority: P1 before going public**
**Solves: Single Gmail account limitation**

**What gets built:**
- `GET /auth/gmail/connect` — generates OAuth URL, redirects to Google
- `GET /auth/gmail/callback` — exchanges code for refresh token, stores in DB
- `DELETE /auth/gmail/disconnect` — revokes token
- `GET /auth/gmail/status` — checks if Gmail connected

**New table:**
```
gmail_oauth_tokens
    id              UUID primary key
    user_id         UUID foreign key
    refresh_token   TEXT (encrypted with AES-256)
    sender_email    TEXT
    created_at      TIMESTAMP
```

---

### Step 3 — Telegram Integration (Optional per user)
**Priority: P3**
**Solves: Human approval before sending replies**

**Flow:**
```
Email processed by pipeline
        ↓
Send preview to user's Telegram bot
        ↓
User sees 3 options:
    ✅ Send    → GmailService.send_reply()
    ✏️  Edit   → user edits in Telegram → send
    ❌ Reject  → discard, mark ticket as reviewed
```

**What gets built:**
- Telegram bot via python-telegram-bot
- Webhook endpoint for Telegram callbacks
- Per-user Telegram bot token storage in DB
- Approval state tracking per email

---

### Step 4 — React Frontend & Analytics Dashboard
**Priority: P3**
**Future goal**

**Metrics to track:**
- Emails processed per day / week / month
- Category distribution (billing, refund, etc.)
- Average response time
- LLM provider usage and failure rates
- Per-user usage vs subscription limit

---

## Remaining Future Goals

| Goal | Status |
|------|--------|
| Google App verification | Needed before public launch |
| Monitoring + alerting | Not started |
| Analytics dashboard | Not started |
| Move to paid LLM models | When revenue justifies cost |
| Kafka for high volume | Only if processing 1000+ emails/min |

---

## Full Build Order Summary

```
Phase 1 — Stability (fix existing problems)
    ✅ Fix 503 on /gmail/push
    ✅ Fix no_new_messages error
    ✅ Fix graceful LLM fallback
    ✅ Supabase setup + idempotency
    ✅ Round robin model router
    ✅ Prompt optimization

Phase 2 — Performance
    → Celery + Redis task queue
    → Async API with task IDs

Phase 3 — Product (needed before public launch)
    ✅ JWT authentication
    ✅ Subscription system + rate limiting
    → Per-user Gmail OAuth

Phase 4 — Features
    ✅ Ticket system
    → Telegram integration
    → Analytics dashboard

Phase 5 — Scale (only when needed)
    → Load balancer
    → Kafka
    → Multi-region deployment
```

---

## Current System State

| Component | Status |
|-----------|--------|
| FastAPI backend | ✅ Live on Render |
| Single Gmail OAuth | ✅ Working |
| Email pipeline (classify/extract/generate) | ✅ Working |
| Gmail watch + Pub/Sub | ✅ Working |
| CI/CD via GitHub Actions | ✅ Passing |
| Prompt files | ✅ In place |
| Tests | ✅ Passing |
| Database | ✅ Working |
| Authentication | ✅ Working (`auth_guard`) |
| Round robin model router | ✅ Working |
| Celery task queue | ❌ Not started |
| Subscription system | ✅ Working (`subscription_service`) |
| Per-user Gmail OAuth | ❌ Not started |
| Ticket system | ✅ Working (`ticket_service`) |
| Telegram integration | ❌ Not started |
| React frontend | ❌ Not started |