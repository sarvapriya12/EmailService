# New Changes to be Made in Backend

This document outlines critical bottlenecks, architectural risks, and implementation strategies identified for the next phase of the backend architecture.

## 1. Critical Bottlenecks to Address

### Synchronous Webhook Processing (FIXED)
- **Problem:** The `/gmail/push` endpoint was running the entire LLM pipeline synchronously, causing Google Pub/Sub retries.
- **Solution:** Implemented a Celery + Redis task queue. The webhook now instantly returns `200 OK` (via queued status) and passes the workload to `process_email_background_task.delay()`.

### Thread Pool Starvation (FIXED)
- **Problem:** Synchronous FastAPI routes performing heavy network I/O were risking thread pool starvation.
- **Solution:** Offloading LLM processing to Celery entirely moved the heavy lifting off the web threads, resolving this bottleneck.

### Ephemeral OAuth Encryption Key Risk
- **Problem:** `services/gmail_oauth_service.py` falls back to generating a temporary encryption key (`Fernet.generate_key()`) if the `OAUTH_ENCRYPTION_KEY` is missing. If the server restarts, the key changes and all stored user refresh tokens become permanently unreadable.
- **Solution:** Enforce a static encryption key as a strict startup requirement.

### Excessive Database Reads for OAuth Credentials (FIXED)
- **Problem:** `get_credentials(user_id)` was hitting Supabase every single time an email was processed.
- **Solution:** Implemented a short-lived thread-safe in-memory cache (`_CREDENTIALS_CACHE`) with a 5-minute TTL in `gmail_oauth_service.py`.

### Gmail Watch Expiration (PENDING EXTERNAL CRON)
- **Problem:** Google's Gmail API `watch()` method expires every 7 days. There is currently no mechanism to renew watches for connected multi-tenant users.
- **Solution:** Currently running as an internal `asyncio` task in `main.py`. This needs to be transitioned to the external API endpoint strategy below.

---

## 2. Gmail Watch Renewal & Cron Job Strategy

Instead of using an internal background task (`asyncio.sleep(86400)`) inside the FastAPI event loop, the system should expose an external, secured API endpoint to handle renewals.

### The Strategy: External API Endpoint (`POST /system/renew-watches`)
- Create a secure endpoint protected by a secret API key header.
- Inside the endpoint, fetch all connected users from Supabase and call the Gmail `watch_inbox()` method for each one.
- Hook this endpoint up to an external service like `cron-job.org` to trigger it once every 24 hours.

### Why External Cron is Better:
1. **Immunity to Server Restarts:** An internal 24-hour timer resets to zero every time the server redeploys or restarts. An external cron runs on its own clock, guaranteeing daily execution.
2. **Visibility:** External cron services provide logs and email alerts if the endpoint fails.
3. **Prevents Duplicated Effort Across Workers:** 
    - **What are workers?** Servers (like Gunicorn/Uvicorn) often run multiple "workers" (independent copies of the FastAPI app) to utilize multiple CPU cores. 
    - If an internal background loop starts on boot, and the server runs 4 workers, there will be 4 separate timers running. All 4 will wake up simultaneously and hit the Google API 4 times for every user.
    - An external API request is handed to exactly *one* worker by the load balancer, ensuring the task only runs once per day.
