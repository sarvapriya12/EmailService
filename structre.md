# AI Email Support System

## Project Overview
This project is an enterprise-grade AI-powered email support system. It automatically processes incoming customer emails, categorizes them, extracts critical structured data, and drafts/sends professional replies using a highly resilient, load-balanced multi-LLM architecture.

## Current Architecture
The system is built on a synchronous FastAPI pipeline, heavily fortified with atomic database locks and memory caches to ensure absolute reliability and prevent race conditions.

* **API Layer:** FastAPI (Python)
* **Database & State:** Supabase (PostgreSQL) for global idempotency locks, ticket tracking, and user settings.
* **LLM Orchestration:** LangChain coupled with a custom `PoolRouter` for dynamic round-robin fallback.
* **Email Integration:** Gmail API (Pub/Sub Watch, Webhook Push, Send).
* **Deployment:** Containerized with Docker, deployed on Render with GitHub Actions CI/CD.

### The Global Message Dedup Pipeline
To handle massive Gmail webhook bursts without processing duplicate emails, the system uses a 3-layer protection shield:
1. **Thread Locks:** Atomic locks (`_CACHE_LOCK`) prevent concurrent FastAPI threads from reading/writing simultaneously.
2. **In-Memory Debounce:** High-speed dictionaries silently drop repeated Gmail `history_id` notifications in <1ms.
3. **Distributed Database Lock:** Supabase primary keys (`idempotency_key = user_id:message_id`) mathematically guarantee an email is processed exactly once globally, regardless of server count.

## System Capacity & Number of Users
* **Internal Users (Tenants):** Currently **1** (Single-tenant). The system connects to a single master Gmail account (using a `system` placeholder ID) to act as the primary organizational support desk. 
* **External Users (Customers):** **Unlimited**. The system can process inbound emails from thousands of unique external customers, automatically tracking their conversational threads via the Supabase Ticket System.
* *(Note: True Multi-Tenant "Per-User Gmail OAuth" is prioritized on the roadmap to support multiple internal organizations).*

## Real-World Scenarios
This architecture is perfectly suited to replace or augment:
1. **Automated Customer Support Desks:** Instantly categorizing and replying to standard inquiries (e.g., "Where is my order?") 24/7 without human intervention.
2. **E-commerce Triage:** Automatically identifying "Refund" or "Billing" emails, extracting the `Order ID` and `Customer Name` for the CRM, and routing them to specialized agents.
3. **IT Helpdesks:** Classifying technical support requests, assigning priority levels, and tracking thread history securely in a database.
4. **Automated Inbox Janitor:** Using filter pipelines to automatically ignore `mailer-daemon` bounces, out-of-office autoreplies, and blocked senders, saving API costs.

## Pros and Cons

### Pros ✅
* **Free-Tier LLM Load Balancing:** The `PoolRouter` intelligently spreads requests across free-tier OpenRouter, Groq, Gemini, and NVIDIA models. It instantly circuit-breaks and falls back if a provider hits a rate limit (429), ensuring zero downtime.
* **Bulletproof Idempotency:** The global deduplication pipeline guarantees no email is ever processed or replied to twice, cleanly handling Google infrastructure retries and webhook fan-outs.
* **Context & Cost Protection:** Utilizes `email-reply-parser` and a 15k-character truncation fallback to intelligently strip old forwarded threads and giant signatures, protecting LLM token limits and Supabase storage.
* **Thread-Safe Scaling:** Implements Double-Checked Locking singletons to protect database connection pools from exhaustion under extreme webhook load.

### Cons ❌
* **Synchronous Bottleneck:** Currently, the API waits for the LLM pipeline to finish executing before returning `200 OK` to Google. Under extremely high concurrent load, this synchronous wait could lead to 503 timeouts.
* **Single Gmail Account:** Hardcoded to use one `.env` Gmail OAuth token until the multi-tenant "Per-User OAuth" database flow is fully implemented.
* **No Frontend GUI:** Fully API-driven. There is no React dashboard yet for agents to view tickets, read extracted data, or manually process the "Review Mode" approval queue.
```
```
