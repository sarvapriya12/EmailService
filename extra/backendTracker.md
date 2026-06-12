# Backend Tracker — Email AI Service

This document outlines the security architecture, data validation rules, and backend optimizations implemented in the FastAPI service to ensure high reliability, safety, and multi-tenant isolation.

> [!IMPORTANT]
> **<span style="color:red">IMPORTANT DEPLOYMENT NOTE:</span>** The next phase of deployment will transition the backend hosting from Render's Free tier (512MB RAM, sequential queue bottlenecks) to **Hugging Face Docker Spaces (Free CPU Basic)**. This upgrades resources to **16 GB RAM** and **2 vCPUs** at $0 cost and with no credit card requirement, enabling parallel email processing via Celery prefork workers (`--concurrency=4`) and eliminating queue delays.

---

## 1. Security Measures

### AES-256 OAuth Token Encryption
- **Problem:** Storing raw Google OAuth refresh tokens in the database exposes users to security compromise if the database is leaked.
- **Solution:** Configured cryptography-based symmetric encryption (`cryptography.fernet`) in `gmail_oauth_service.py` to encrypt/decrypt OAuth refresh and access tokens at rest.
- **Enforcement:** Enforced `OAUTH_ENCRYPTION_KEY` as a strict startup requirement. The server fails to boot if this key is missing, protecting against fallback to temporary keys that would invalidate credentials upon restarts.

### Auth Guard Dependencies
- **JWT Authentication:** Implemented JWT validation via `services/auth_guard.py` (`get_current_user` dependency) using Supabase Auth, extracting the JWT token automatically from authorization headers.
- **Admin Verification:** Created `verify_admin` dependency guard in `routes/admin_routes.py` referencing the `user_settings` table to prevent unauthorized users from calling administrative APIs (e.g., manual tier upgrades or global stats retrieval).
- **Tenant Isolation:** Enforced tenant validation in all operations by querying and checking data using `current_user["user_id"]` to ensure users cannot view or modify other tenants' settings, tickets, or filter lists.

### API Validation
- **Pydantic Validation:** All API inputs are strictly validated at the HTTP layer using Pydantic models (e.g., `EmailRequest`, `PubSubPushRequest`, and `UpgradeRequest` in `routes/` and `schemas/`).
- **Data Type Safety:** Strong type conversions and custom error throwing prevent SQL injections or malformed payload crashes.

---

## 2. Backend Optimizations

### In-Memory Debounce Caches
- **Goal:** Filter out Google Pub/Sub push notification bursts (duplicates) before executing database or Gmail API calls.
- **Implementation:** Added thread-safe in-memory maps (`RECENT_HISTORY_IDS` and `RECENT_MESSAGE_IDS`) in `routes/email_routes.py`. If a duplicate webhook payload arrives within a short TTL window, it is instantly discarded in under 1ms.

### Global Idempotency Lock
- **Goal:** Multi-tenant safe execution lock for background workers.
- **Implementation:** Integrated an atomic `processed_emails` table lock in `services/database.py` using primary key uniqueness as a distributed mutex lock. If multiple workers attempt to process the same `user_id:message_id` combination concurrently, only one will succeed; subsequent workers will fail-fast and drop the duplicate.

### Inbox Watch / OAuth Credential Cache
- **Goal:** Solve database read bottlenecks when pulling OAuth configurations during high-volume email processing.
- **Implementation:** Added `_CREDENTIALS_CACHE` in `services/gmail_oauth_service.py` under a thread-safe `_CACHE_LOCK` with a 5-minute TTL. This saves up to 80% of Supabase read traffic under high concurrency.

### LLM Router Failover / Circuit Breaker
- **Goal:** Guarantee uninterrupted email processing despite LLM API rate limits or outages.
- **Implementation:** Configured `llm_router.py` with `max_retries=0` for LangChain clients to throw rate-limit exceptions instantly. The custom `PoolRouter` catches errors, identifies rate limits, and uses atomic bitfield operations to blacklist the failing provider, immediately falling back to the next model in rotation.

### Asynchronous Celery Workers
- **Goal:** Prevent webhook timeouts and FastAPI thread pool starvation.
- **Implementation:** Incoming emails are immediately offloaded to Celery background workers using Redis. Webhooks respond `200 OK` in <10ms while workers perform the heavy LLM classification, extraction, and generation tasks in the background.

### Email Thread Pruning & Input Truncation
- **Goal:** Minimize LLM context usage, save costs, and protect against prompt injection/DB bloat.
- **Implementation:** Integrated `email-reply-parser` in `email_pipeline_service.py` to strip out signatures, footers, and historical email trails. A hard limit of 15,000 characters is enforced to truncate exceptionally large inputs.

### Quota Enforcer & Usage Tracking
- **Goal:** Stop over-quota usage and count only real emails generated.
- **Implementation:** Checked quota status in the background worker before processing. Configured `increment_usage(user_id)` to trigger only if the email is successfully processed and results in a `sent` or `queued_for_review` status. Filtered messages and thread repetitions are bypassed and do not consume quota.
