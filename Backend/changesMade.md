# LLM Router Improvements

By adding the exception handling and rate-limit detection block inside `PoolRouter.invoke` (`services/llm_router.py`), a highly resilient, self-healing routing mechanism was introduced for the LLM calls. 

Here is exactly what the code is doing and how it changed the system:

### 1. Graceful Fallback (Preventing Crashes)
Before this change, if an LLM provider (like Groq or OpenRouter) had a temporary outage, threw a 500 server error, or timed out, the entire application would crash, and the email would fail to process. 
By wrapping the invocation in a `try/except` and logging the warning, the system now catches the crash, records which model failed (so it appears in logs), and stays alive.

### 2. Smart Rate Limit Detection
LLM providers enforce strict quotas (e.g., "requests per minute"). When you exceed them, they throw an HTTP `429 Too Many Requests` or "Rate limit exceeded" error. The code intelligently scans the error message string to see if the failure was specifically due to a rate limit rather than a random timeout or server error.

### 3. Dynamic "Circuit Breaker" (Bitfield Tracking)
If the code detects a rate limit, it calls `_mark_unavailable`. Because the router is built using a bitfield (`self._available &= ~(1 << index)`), this function instantly toggles that specific model's availability bit to `0`. 
* **The impact:** If Groq rate-limits you, your system instantly "blacklists" Groq for subsequent requests in that cycle, routing all new emails to Gemini or OpenRouter without wasting time trying (and failing) on Groq again.

### 4. Seamless Round-Robin Retry
Instead of returning an error to the user, the `continue` statement immediately jumps back to the top of the `for` loop, grabs the *next* available model in the pool, and tries the prompt again. The client calling the API (or the background email worker) has no idea the first model failed—they just get a successful response a few seconds later.

### Summary of What Was Achieved:
With just these few lines, problems **#2, #3, #4, and #5** from the project roadmap were successfully solved. This code creates a load-balancer that spreads traffic across multiple free LLM tiers and dynamically removes models from the rotation the millisecond they run out of quota, seamlessly falling back to the next available provider.

### 5. Email Thread Pruning and Input Truncation
To protect the LLM context limits and database storage from massive email threads, `email-reply-parser` was added to the `EmailPipelineService`. It intelligently strips out old forwarded history, nested replies, and giant signatures. A generous 15,000-character fallback truncation was also added to ensure that no single message can crash the system or cause database bloat.

### 6. Webhook Burst Handling & Race Condition Prevention
To handle massive bursts of duplicate Gmail push notifications, thread-safe in-memory caches (`RECENT_HISTORY_IDS` and `RECENT_MESSAGE_IDS`) with a TTL were added to `routes/email_routes.py`. These caches intercept and silently drop duplicate webhooks in under 1ms *before* any logging, Supabase DB operations, or Gmail API calls occur. This eliminates race conditions, 409 Conflict database spam, and noisy server logs.

### 7. LLM Pipeline Stall Prevention (Removed SDK Retries)
To prevent LangChain from stalling the pipeline on API rate limits (e.g., pausing for 45 seconds when hitting Gemini's daily quota limit), `max_retries=0` was explicitly set for all LLM clients (`ChatGroq`, `ChatOpenAI`, `ChatGoogleGenerativeAI`, `ChatNVIDIA`) in `services/llm_router.py`. This ensures that rate limits instantly throw an exception, allowing the custom `PoolRouter` to trigger its seamless round-robin fallback with zero delay.

### 8. Database Connection Singleton (Double-Checked Locking)
To fix a major database connection bottleneck, a thread-safe Singleton was implemented in `services/database.py` using the Double-Checked Locking pattern. Instead of opening a new Supabase connection pool for every concurrent FastAPI thread during a webhook burst, the atomic thread lock (`_db_lock`) guarantees the client is only instantiated once. This completely protects the server's memory and ports from exhaustion during traffic spikes.

### 9. Fully Atomic Router State
In `services/llm_router.py`, the model selection logic (`_next_available()`) was moved completely inside the existing thread lock block. This prevents edge-case race conditions where a model's availability bitfield might reset exactly while another thread is reading it, ensuring perfectly thread-safe round-robin routing under high concurrency.

### 10. Global Message Dedup Pipeline (Distributed Idempotency)
To completely eliminate duplicate processing across multiple server instances, the deduplication system was upgraded to an industry-standard Global Idempotency Lock.
* **Global Keys:** Replaced `gmail_message_id` checks with a global `idempotency_key` (combining `user_id:message_id`).
* **Atomic Database Locks:** Implemented the `processed_emails` table where the `id` is the Primary Key. This acts as a distributed mutex, guaranteeing that even if 10 webhooks arrive simultaneously, only one server instance can ever succeed in inserting the key and processing the email.
* **Retry-Safe Processing:** Added status tracking (`processing`, `done`, `failed`, `filtered`). If a pipeline worker crashes mid-generation, the webhook retry can safely identify the `failed` status, re-acquire the lock, and process the email again.

### 11. Section 1 — Business Profiles (Dynamic Configuration)
To allow different organizations to use the system with customized AI rules, Business Profiles were introduced.
* **Database Tables:** Added `business_profile_presets` (system-defined) and `user_business_profiles` (user overrides).
* **Dynamic Fallback Merging:** `business_service.py` intelligently merges a user's custom settings (tone, style, categories) with their chosen business preset.
* **Pipeline Integration:** `EmailPipelineService` now fetches this configuration per-user and injects dynamic `$tone_style_instruction`, `$categories`, and `$fields` into the LangChain templates, replacing hardcoded rules.

### 12. Section 2 — Per-User Gmail OAuth (Multi-Tenancy)
The system was upgraded from a single-tenant (one hardcoded `.env` email) to a fully multi-tenant architecture.
* **Secure Token Vault:** The `gmail_oauth_tokens` table was created. Google Refresh Tokens are encrypted at rest using AES-128 (via `cryptography`'s Fernet) and a master `OAUTH_ENCRYPTION_KEY`.
* **Per-User Credentials:** `GmailService` now takes an optional `user_id`, dynamically fetching, decrypting, and refreshing tokens on the fly from the database.
* **Multi-Tenant Webhook Routing:** `POST /gmail/push` dynamically parses the `email_address` from the incoming Pub/Sub payload, maps it back to a `user_id` in the database, and processes the email using that specific user's OAuth tokens and Business Profile rules.

### 13. Multi-Tenant History ID Tracking
When moving to per-user OAuth, the single global `history_id` cursor was creating a race condition where one user receiving an email would advance the cursor for everyone, causing missed emails for other users.
* **Watch State DB:** Updated the `gmail_watch_state` table to track by `user_id` instead of a hardcoded `id=1`. `services/database.py` was updated to use `.upsert()` with `on_conflict="user_id"`.
* **In-Memory Cache Isolation:** Updated the `RECENT_HISTORY_IDS` debounce cache in `routes/email_routes.py` to prefix keys with `user_id` (e.g., changing `incoming_history_id` to `f"{user_id}:{incoming_history_id}"`) so users with coincidentally identical history IDs do not block each other.
* **Dynamic Webhook Cursor:** The `/gmail/push` webhook now resolves the `user_id` immediately upon receiving the payload and passes it to `get_last_history_id(user_id)` and `update_last_history_id(...)`, guaranteeing independent email cursors per mailbox.

### 14. Section 3.5 — Admin System (Manual Provisioning)
To bypass third-party payment gateway friction (Stripe/Razorpay compliance), a custom Admin System was built.
* **Super Admin Auth:** Added `is_admin` flag to `user_settings` and a `verify_admin` dependency guard in FastAPI to strictly protect admin routes.
* **System Stats:** `GET /admin/stats` tracks global email processing volume, failures, total tickets, and active user count.
* **User Management & Upgrades:** `GET /admin/users` lists all users and their connected Gmails, and `POST /admin/users/{user_id}/upgrade` allows the admin to manually bypass billing and instantly assign higher tier limits.

### 15. Section 4 — React Frontend Initialization
Transitioned the project into a Monorepo structure by initializing the frontend.
* **Vite + React:** Scaffolded a new React application inside the `frontend/` directory.
* **Tailwind CSS:** Configured `tailwind.config.js` and injected base styles for rapid UI development.
* **Axios API Client:** Created `src/services/api.js` with an interceptor to seamlessly inject the JWT `Bearer` token into every request to the FastAPI backend.

### 16. Celery & Redis Task Queue Integration (Asynchronous Processing)
To solve Google Pub/Sub timeout issues and thread pool starvation, the heavy LLM pipeline was offloaded to background workers.
* **Queue Implementation:** Configured `celery_app.py` connecting to Redis with separated databases for the message broker (`/0`) and result backend (`/1`).
* **Webhook Offloading:** The `POST /gmail/push` and `POST /process-email` endpoints now instantly return a `200 OK` or `202 Accepted` alongside a `task_id`, handing the actual processing to `process_email_background_task.delay()`.
* **Task Polling Endpoint:** Added `routes/task_routes.py` with a `GET /tasks/{task_id}` endpoint to allow the frontend to poll for asynchronous completion.

### 17. OAuth Credential In-Memory Caching (Database Optimization)
To fix a critical database bottleneck where processing a single email resulted in multiple redundant database queries for the user's OAuth tokens.
* **Cache Layer:** Implemented `_CREDENTIALS_CACHE` in `services/gmail_oauth_service.py` with a thread-safe `_CACHE_LOCK`.
* **TTL Logic:** The cache securely holds decrypted credentials in memory for 5 minutes (`_CACHE_TTL`), radically reducing database I/O latency while remaining responsive to revoked or expired tokens.

### 18. External Cron for Gmail Watch Renewals (Multi-Worker Safe)
To make the system safe for multi-worker deployments (e.g., Gunicorn/Uvicorn with multiple workers) and to guarantee execution regardless of server restarts, the internal `asyncio.sleep` timer for Gmail watch renewals was removed. 
* **New Secure Endpoint:** Created `POST /system/renew-watches` protected by an `X-Cron-Secret` header.
* **Multi-Tenant Renewal:** The endpoint fetches all active connected users from the `gmail_oauth_tokens` table and safely renews their watch subscriptions individually.

### 19. Strict OAuth Encryption Key Enforcement
To prevent the ephemeral key risk (where a server restart would generate a new fallback key and permanently invalidate all stored OAuth refresh tokens in the database), `services/gmail_oauth_service.py` was updated to strictly require `OAUTH_ENCRYPTION_KEY` in the environment variables on startup. The CI pipeline was also updated to supply a dummy key to pass sanity checks safely.

### 20. CI/CD Import Issue Fix & Duplicate Import Removal
Removed the duplicate `from Backend.config import settings` import from [main.py](file:///D:/machine%20learning/LangchainEmailServiceProject/Backend/main.py), leaving only the correct relative import `from config.settings import settings`. This resolves the `ModuleNotFoundError: No module named 'Backend'` crash in the GitHub Actions runner (where the backend contents are checked out directly at the root of the runner's workspace).

### 21. Pydantic v2 Configuration Conflict Fix
Removed the obsolete `class Config` block from [config/settings.py](file:///D:/machine%20learning/LangchainEmailServiceProject/Backend/config/settings.py). Because Pydantic v2 model settings are already configured via `model_config = SettingsConfigDict(...)`, having both `Config` and `model_config` defined on the same `BaseSettings` subclass raised a `PydanticUserError` on startup. This ensures the backend starts up cleanly under Pydantic v2.