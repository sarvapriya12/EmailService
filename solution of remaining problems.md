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

---

## Next Steps — In Order

---

### Step 1 — Supabase PostgreSQL Setup
**Priority: P0**
**Solves Problems: #11, #12**

**What it solves:**
- Problem 11: Duplicate email reprocessing — store processed Gmail message IDs
- Problem 12: Missing idempotency — check message ID before processing

**What gets built:**
- Supabase project setup
- Database connection via SQLAlchemy
- `processed_messages` table — stores Gmail message IDs that have been processed
- Before processing any email: check if message ID exists → skip if yes → store if no

**Tables needed:**
```
processed_messages
    id              UUID primary key
    gmail_message_id  TEXT unique
    processed_at    TIMESTAMP
    sender_email    TEXT
    subject         TEXT
    status          TEXT
```

**Remaining after this step:**
- Problems 2, 3, 4, 9, 10 still open

---

### Step 2 — Round Robin Model Router
**Priority: P1**
**Solves Problems: #2, #3, #4, #9**

**What it solves:**
- Problem 2: OpenRouter rate limit exhausted — spreads load across 9 models
- Problem 3: Groq rate limit exhausted — no single model takes all traffic
- Problem 4: Gemini quota exhausted — distributed across pools
- Problem 9: Excessive LLM calls — each task gets dedicated model pool

**Model System:**

Each pipeline task gets its own pool of 3 models. Models are selected best-fit for each task.

```
Classification Pool — fast, accurate categorization:
    Model 1: groq/llama-3.3-70b-versatile
    Model 2: openrouter/google/gemma-3-27b-it:free
    Model 3: gemini/gemini-2.0-flash

Extraction Pool — structured output, precise field extraction:
    Model 4: openrouter/deepseek/deepseek-r1-0528:free
    Model 5: groq/llama-3.3-70b-versatile
    Model 6: gemini/gemini-2.5-flash

Generation Pool — quality writing, professional tone:
    Model 7: gemini/gemini-2.5-pro
    Model 8: openrouter/meta-llama/llama-3.3-70b-instruct:free
    Model 9: openrouter/deepseek/deepseek-r1-0528:free
```

**How round robin works:**
```
10 requests arrive simultaneously

Request 1 → Classification Pool → Model 1
Request 2 → Classification Pool → Model 2
Request 3 → Classification Pool → Model 3
Request 4 → Classification Pool → Model 1 (wraps around)
...

Each request gets a different model
No single model handles all traffic
Quota spread evenly across all 9 models
```

**Failure handling:**
```
Assigned model fails (rate limit / timeout)
        ↓
Try next model in same pool
        ↓
All 3 models in pool fail
        ↓
Return graceful fallback response
        ↓
Log failure for monitoring
```

**What gets built:**
- `app/core/model_config.py` — 9 model definitions across 3 pools
- Refactored `llm_router.py` — round robin counter per pool using Redis
- Each service (classifier, extractor, generator) gets its own pool

**Remaining after this step:**
- Problem 10 still open (prompt size)

---

### Step 3 — Prompt Optimization
**Priority: P1**
**Solves Problem: #10**

**What it solves:**
- Problem 10: Prompts too large — reduce token usage per call

**Target token counts:**
```
Classification: 100-150 tokens (currently ~300+)
Extraction:     150-200 tokens (currently ~500+)
Generation:     100-150 tokens (currently ~400+)
```

**What gets built:**
- Rewrite all 3 prompt files to be concise
- Remove redundant instructions
- Test output quality after reduction

**Remaining after this step:**
- All 12 original problems resolved

---

### Step 4 — Celery + Redis Task Queue
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

### Step 5 — Authentication & User Accounts
**Priority: P1 before going public**
**Solves: Security, multi-user support**

**What gets built:**
- JWT authentication (python-jose)
- User registration and login endpoints
- Password hashing (bcrypt)
- Protected routes — only authenticated users can call /process-email

**New tables in Supabase:**
```
users
    id              UUID primary key
    email           TEXT unique
    hashed_password TEXT
    subscription_tier TEXT default 'free'
    emails_used     INTEGER default 0
    created_at      TIMESTAMP
```

---

### Step 6 — Subscription System + Rate Limiting
**Priority: P1 before going public**
**Solves: Free tier abuse, monetization**

**Subscription tiers:**
```
Free     → 50 emails/month
Starter  → 500 emails/month   (1 month billing)
Pro      → 2000 emails/month  (3 month billing)
Business → unlimited          (12 month billing)
```

**Rate limiting via Redis:**
- Track emails processed per user per billing period
- Daily cap for free tier on top of monthly cap
- Return 429 Too Many Requests when limit hit

**New tables:**
```
subscriptions
    id          UUID primary key
    user_id     UUID foreign key
    tier        TEXT
    start_date  TIMESTAMP
    end_date    TIMESTAMP
    status      TEXT
```

---

### Step 7 — Per-User Gmail OAuth
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

### Step 8 — Ticket System
**Priority: P2**
**Solves: Duplicate replies, conversation tracking**

**Ticket flow:**
```
New email arrives
        ↓
Check if sender has open ticket
        ↓
Yes → append to existing ticket, no auto-reply
No  → create new ticket (UUID), send auto-reply
        ↓
Ticket stays open until manually resolved
```

**Ticket states:**
```
open → in_progress → resolved → closed
```

**New table:**
```
tickets
    id              UUID primary key
    user_id         UUID foreign key
    sender_email    TEXT
    subject         TEXT
    status          TEXT
    created_at      TIMESTAMP
    resolved_at     TIMESTAMP
```

---

### Step 9 — Telegram Integration (Optional per user)
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

### Step 10 — Analytics Dashboard
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
| React frontend | Not started |
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
    → Supabase setup + idempotency
    → Round robin model router
    → Prompt optimization

Phase 2 — Performance
    → Celery + Redis task queue
    → Async API with task IDs

Phase 3 — Product (needed before public launch)
    → JWT authentication
    → Subscription system + rate limiting
    → Per-user Gmail OAuth

Phase 4 — Features
    → Ticket system
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
| Database | ❌ Not started |
| Authentication | ❌ Not started |
| Round robin model router | ❌ Not started |
| Celery task queue | ❌ Not started |
| Subscription system | ❌ Not started |
| Per-user Gmail OAuth | ❌ Not started |
| Ticket system | ❌ Not started |
| Telegram integration | ❌ Not started |
| React frontend | ❌ Not started |