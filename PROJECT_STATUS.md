# Email AI Service — Project Status & Roadmap

---

## What Has Been Built & Fixed

| # | Item | Status |
|---|------|--------|
| 1 | `config/settings.py` — pydantic-settings BaseSettings, reads from `.env` | ✅ Done |
| 2 | `services/llm_router.py` — OpenRouter, Groq, Gemini with sequential fallback | ✅ Done |
| 3 | `services/classifier.py` — email category classifier with regex parser | ✅ Done |
| 4 | `services/extractor.py` — structured field extractor with key normalizer | ✅ Done |
| 5 | `services/email_generator.py` — support reply generator | ✅ Done |
| 6 | `services/gmail_service.py` — OAuth2, send reply, fetch messages, watch inbox | ✅ Done |
| 7 | `services/gmail_watch_service.py` — Pub/Sub notification parser | ✅ Done |
| 8 | `services/email_pipeline_service.py` — orchestrates classify → extract → generate → send | ✅ Done |
| 9 | `routes/email_routes.py` — `/process-email`, `/gmail/watch`, `/gmail/push` | ✅ Done |
| 10 | `schemas/email.py` — Pydantic request/response models | ✅ Done |
| 11 | `main.py` — FastAPI app factory, `/` and `/health` routes | ✅ Done |
| 12 | `prompts/` — external prompt files for classifier, extractor, generator | ✅ Done |
| 13 | `.env` — API keys for OpenRouter, Groq, Gemini, Gmail, Supabase | ✅ Done |
| 14 | `Dockerfile` + `.dockerignore` — container build | ✅ Done |
| 15 | `render.yaml` — Render deployment config, `autoDeploy: false` | ✅ Done |
| 16 | GitHub Actions CI — validate → compile → test → Docker build | ✅ Done |
| 17 | GitHub Actions CD — deploy to Render only after CI passes | ✅ Done |
| 18 | `tests/test_classifier.py` — 5 unit tests, all passing in CI | ✅ Done |
| 19 | Supabase project — `processed_messages` table with RLS | ✅ Done |
| 20 | `services/database.py` — Supabase client, `is_already_processed`, `mark_as_processed` | ✅ Done |
| 21 | Idempotency check wired into `/gmail/push` — duplicate emails skipped | ✅ Done |
| 22 | Router throws graceful fallback instead of crashing on all-provider failure | ✅ Done |
| 23 | `/gmail/push` always returns 200 — stops Pub/Sub infinite retry loop | ✅ Done |

---

## Current System State

| Component | Status |
|-----------|--------|
| FastAPI backend | ✅ Live on Render (`https://emailservice-jccz.onrender.com`) |
| Single Gmail OAuth | ✅ Working |
| Email pipeline (classify → extract → generate → send) | ✅ Working |
| Gmail Watch + Pub/Sub | ✅ Working |
| CI/CD via GitHub Actions | ✅ Passing |
| Prompt files | ✅ In place (already lean, no optimization needed) |
| Unit tests | ✅ 5 passing in CI |
| Supabase database | ✅ Connected |
| Idempotency (duplicate email prevention) | ✅ Working |
| Round robin model router | ❌ Not started |
| Celery task queue | ❌ Not started |
| Authentication | ❌ Not started |
| Subscription system | ❌ Not started |
| Per-user Gmail OAuth | ❌ Not started |
| Ticket system | ❌ Not started |
| Telegram integration | ❌ Not started |
| React frontend | ❌ Not started |

---

## Known Issues

| # | Issue | Cause | Fix |
|---|-------|-------|-----|
| 1 | All LLM providers hit rate limits simultaneously | Only 1 model per provider, all exhaust daily quota together | Round robin router with 9 models across 3 pools |
| 2 | Rate limit errors visible in Render logs | Expected behavior — router tries each provider and logs failures | Not a bug, resolved by round robin spreading load |

---

## Next Steps — In Order

---

### Step 1 — Round Robin Model Router
**Priority: P0 — blocking, causes total failure when quotas exhaust**

**What it solves:**
- All 3 providers hitting daily rate limits simultaneously
- Single model taking all traffic per provider
- No load distribution across available free models

**Model pools (9 models across 3 tasks):**

```
Classification Pool — fast categorization:
    Model 1: groq/llama-3.3-70b-versatile
    Model 2: openrouter/google/gemma-3-27b-it:free
    Model 3: gemini/gemini-2.0-flash-lite

Extraction Pool — structured output:
    Model 4: openrouter/deepseek/deepseek-r1-0528:free
    Model 5: groq/llama-3.3-70b-versatile
    Model 6: gemini/gemini-2.0-flash

Generation Pool — quality reply writing:
    Model 7: openrouter/meta-llama/llama-3.3-70b-instruct:free
    Model 8: groq/qwen/qwen3-32b
    Model 9: openrouter/poolside/laguna-xs.2:free
```

**How round robin works:**
```
Request 1 → Pool → Model 1
Request 2 → Pool → Model 2
Request 3 → Pool → Model 3
Request 4 → Pool → Model 1 (wraps around)

If assigned model fails → try next in pool → if all fail → graceful fallback
```

**Files to build:**
- `app/core/model_config.py` — 9 model definitions across 3 pools
- Refactor `services/llm_router.py` — in-memory round robin counter per pool
- Update `services/classifier.py`, `extractor.py`, `email_generator.py` — each gets its own pool

**Note:** Round robin counter is in-memory for now. When Celery + Redis is added in Step 3, swap counter to Redis for cross-worker consistency.

---

### Step 2 — Celery + Redis Task Queue
**Priority: P1**

**What it solves:**
- Multiple emails processed simultaneously without blocking
- API returns immediately instead of waiting 10 seconds
- Retries with exponential backoff
- Dead letter queue for permanently failed emails

**How it changes the API:**
```
Before: POST /process-email → wait 10s → return result
After:  POST /process-email → return task_id immediately (202)
        GET /task/{task_id} → return result when ready
```

**Files to build:**
- Redis on Render
- `celery_app.py` — Celery worker config
- Task chain: `classify → extract → generate → send`
- `GET /task/{task_id}` endpoint
- Swap round robin counter from in-memory to Redis

---

### Step 3 — Authentication & User Accounts
**Priority: P1 before going public**

**What gets built:**
- JWT authentication (`python-jose`)
- User registration and login endpoints
- Password hashing (`bcrypt`)
- Protected routes

**New Supabase table:**
```
users
    id                UUID primary key
    email             TEXT unique
    hashed_password   TEXT
    subscription_tier TEXT default 'free'
    emails_used       INTEGER default 0
    created_at        TIMESTAMP
```

---

### Step 4 — Subscription System + Rate Limiting
**Priority: P1 before going public**

**Tiers:**
```
Free     → 50 emails/month
Starter  → 500 emails/month
Pro      → 2000 emails/month
Business → unlimited
```

**New Supabase table:**
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

### Step 5 — Per-User Gmail OAuth
**Priority: P1 before going public**

**What gets built:**
- `GET /auth/gmail/connect` — OAuth URL
- `GET /auth/gmail/callback` — exchanges code, stores token
- `DELETE /auth/gmail/disconnect`
- `GET /auth/gmail/status`

**New Supabase table:**
```
gmail_oauth_tokens
    id              UUID primary key
    user_id         UUID foreign key
    refresh_token   TEXT (encrypted AES-256)
    sender_email    TEXT
    created_at      TIMESTAMP
```

---

### Step 6 — Ticket System
**Priority: P2**

**Ticket states:** `open → in_progress → resolved → closed`

**New Supabase table:**
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

### Step 7 — Telegram Integration
**Priority: P3**

**Flow:**
```
Email processed → send preview to Telegram bot
User chooses: ✅ Send / ✏️ Edit / ❌ Reject
```

---

### Step 8 — Analytics Dashboard
**Priority: P3**

Metrics: emails per day, category distribution, LLM usage, failure rates, per-user usage.

---

## Full Build Order Summary

```
Phase 1 — Stability (current focus)
    ✅ Supabase + idempotency
    ✅ Graceful LLM fallback
    ✅ Pub/Sub 200 response
    → Round robin model router        ← NEXT

Phase 2 — Performance
    → Celery + Redis task queue

Phase 3 — Product (before public launch)
    → JWT authentication
    → Subscription system
    → Per-user Gmail OAuth

Phase 4 — Features
    → Ticket system
    → Telegram integration
    → Analytics dashboard

Phase 5 — Scale (when needed)
    → Load balancer
    → Kafka
    → Multi-region deployment
```

---

## Future Goals

| Goal | Status |
|------|--------|
| React frontend | Not started |
| Google App verification | Needed before public launch |
| Monitoring + alerting | Not started |
| Move to paid LLM models | When revenue justifies |
| Kafka for high volume | Only at 1000+ emails/min |
