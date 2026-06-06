# Email AI Service — Complete Build Roadmap
**Last Updated: June 6, 2026**

---

## What Is Already Built

| Component | File | Status |
|-----------|------|--------|
| FastAPI app | `main.py` | ✅ |
| JWT Auth | `services/auth_service.py`, `services/auth_guard.py` | ✅ |
| Auth routes | `routes/auth_routes.py` | ✅ |
| Email pipeline | `services/email_pipeline_service.py` | ✅ |
| Classifier | `services/classifier.py` | ✅ |
| Extractor | `services/extractor.py` | ✅ |
| Generator | `services/email_generator.py` | ✅ |
| LLM Router | `services/llm_router.py` | ✅ |
| Gmail service | `services/gmail_service.py` | ✅ |
| Gmail watch | `services/gmail_watch_service.py` | ✅ |
| Prompt loader | `services/prompt_loader.py` | ✅ |
| Database | `services/database.py` | ✅ |
| Supabase | All tables created | ✅ |
| Ticket system | `services/ticket_service.py`, `routes/ticket_routes.py` | ✅ |
| Filters | `services/filter_service.py`, `routes/filter_routes.py` | ✅ |
| Approval queue | `services/approval_service.py`, `routes/queue_routes.py` | ✅ |
| User settings | `services/settings_service.py`, `routes/settings_routes.py` | ✅ |
| Subscription | `services/subscription_service.py` | ✅ |
| Email routes | `routes/email_routes.py` | ✅ |
| CI/CD | `.github/workflows/ci.yml` | ✅ |
| Deployment | `render.yaml`, `Dockerfile` | ✅ |
| Prompt files | `prompts/` folder | ✅ |

---

---

# SECTION 1 — Business Profiles
**Goal: Let users select their business type during onboarding and configure the AI accordingly**

---

### 1.1 — Supabase Tables

**Run in Supabase SQL Editor:**

`business_profile_presets`
- Stores system-defined presets for each business type
- One row per business type
- Contains default categories, fields, tone, style
- Managed by you, not by users
- Never changes unless you add a new business type

`user_business_profiles`
- Stores each user's selected business type and customizations
- One row per user
- Links to a preset via `preset_type_key`
- Stores tone and style overrides
- Stores custom category overrides (Pro+ only)
- Has `onboarding_complete` flag

---

### 1.2 — Seed Data

**File: `scripts/seed_business_presets.py`**

What it does:
- Inserts the 6 preset rows into `business_profile_presets`
- Run once after table creation
- Each preset contains:
  - Categories for the classifier
  - Extraction fields for the extractor
  - Default tone (friendly/professional/warm/casual/enthusiastic)
  - Default style (concise/detailed/empathetic/solution-first/apologetic)

Presets to seed:
- `clothing` — Clothing & Products
- `food` — Food & Cafe
- `freelancer` — Freelancer / Services
- `digital` — Digital Products
- `coaching` — Coaching / Education
- `general` — General (default)

---

### 1.3 — Service

**File: `services/business_service.py`**

What it does:
- `get_all_presets()` — returns all 6 presets for onboarding selection screen
- `get_preset(type_key)` — returns one preset by type key
- `get_or_create_profile(user_id)` — fetches user profile or creates default (general)
- `set_business_type(user_id, type_key)` — sets user's business type, resets customizations to preset defaults
- `update_tone(user_id, tone)` — updates user's tone preference
- `update_style(user_id, style)` — updates user's style preference
- `update_categories(user_id, categories)` — updates custom categories (Pro+ only)
- `complete_onboarding(user_id)` — marks onboarding as complete
- `get_active_config(user_id)` — returns the merged config (custom overrides preset)

The `get_active_config` function is the most important — it's called by the email pipeline on every email to get the right categories, fields, tone, and style for that user.

---

### 1.4 — Routes

**File: `routes/business_routes.py`**

Endpoints:
- `GET /business/presets` — list all presets (used during onboarding)
- `GET /business/profile` — get current user's profile
- `POST /business/profile/type` — set business type
- `PATCH /business/profile/tone` — update tone
- `PATCH /business/profile/style` — update style
- `PATCH /business/profile/categories` — update categories (Pro+ only)
- `POST /business/profile/complete-onboarding` — mark onboarding done

---

### 1.5 — Wire Into Pipeline

**File: `services/email_pipeline_service.py` (update)**

What changes:
- On every email, call `business_service.get_active_config(user_id)`
- Pass the active categories to the classifier prompt
- Pass the active fields to the extractor prompt
- Pass the active tone + style to the generator prompt
- Prompts become dynamic per user instead of static

**File: `services/prompt_loader.py` (update)**

What changes:
- Accept tone and style as parameters
- Build combined tone+style instruction string
- Inject into generator prompt template

---

---

# SECTION 2 — Per-User Gmail OAuth
**Goal: Each user connects their own Gmail account instead of sharing yours**

---

### 2.1 — Supabase Table

`gmail_oauth_tokens`
- Stores one OAuth token per user
- `user_id` — foreign key
- `refresh_token` — encrypted with AES-256 before storing
- `sender_email` — the Gmail address
- `access_token` — cached, refreshed automatically
- `token_expiry` — when access token expires
- `created_at`, `updated_at`

---

### 2.2 — Service

**File: `services/gmail_oauth_service.py`**

What it does:
- `get_oauth_url(user_id)` — generates Google OAuth consent URL with correct scopes
- `exchange_code(user_id, code)` — exchanges auth code for refresh token, encrypts and stores it
- `get_credentials(user_id)` — retrieves and decrypts stored token, refreshes if expired
- `revoke_token(user_id)` — revokes Google access, deletes from DB
- `is_connected(user_id)` — checks if user has a connected Gmail account
- `encrypt_token(token)` — AES-256 encryption before DB storage
- `decrypt_token(encrypted)` — decryption when reading from DB

---

### 2.3 — Routes

**File: `routes/gmail_oauth_routes.py`**

Endpoints:
- `GET /auth/gmail/connect` — generates OAuth URL, returns it to frontend
- `GET /auth/gmail/callback` — Google redirects here after user clicks Allow, exchanges code for token, redirects user to dashboard
- `DELETE /auth/gmail/disconnect` — revokes token, removes from DB
- `GET /auth/gmail/status` — returns whether Gmail is connected and which email

---

### 2.4 — Update Gmail Service

**File: `services/gmail_service.py` (update)**

What changes:
- Accept `user_id` parameter
- Use `gmail_oauth_service.get_credentials(user_id)` instead of `.env` credentials
- Falls back to system account if no user credentials found
- Every send, fetch, and watch call becomes per-user

---

### 2.5 — Update Pipeline

**File: `services/email_pipeline_service.py` (update)**

What changes:
- Remove `user_id="system"` placeholder
- Pass real `user_id` to `GmailService`
- Gmail watch notifications look up `user_id` by email address from `gmail_oauth_tokens` table

---

### 2.6 — Google App Verification

Not a code task — a Google submission task.

What to prepare:
- Privacy policy page (can be simple HTML hosted on Render)
- Terms of service page
- Real domain (not `.onrender.com`)
- Submit app at console.cloud.google.com for verification
- Takes 1-3 weeks

Do this before public launch.

---

---

# SECTION 3 — Payment Integration
**Goal: Users pay, subscription activates automatically, costs are self-managed**

---

### 3.1 — Choose Gateway

Options:
- **Razorpay** — better for India, INR pricing, UPI support
- **Stripe** — better for international, USD pricing

Decision affects which SDK you install. Architecture is identical either way.

---

### 3.2 — Update Subscriptions Table

Add to existing `subscriptions` table:
- `billing_cycle` — monthly / 3_month / 6_month / 12_month
- `payment_gateway` — razorpay / stripe / manual
- `payment_reference` — transaction ID from gateway
- `auto_renew` — boolean

---

### 3.3 — Service

**File: `services/payment_service.py`**

What it does:
- `create_order(user_id, tier, billing_cycle)` — creates payment order on gateway, returns payment URL or order ID
- `verify_payment(payment_data)` — verifies payment signature from gateway webhook
- `activate_subscription(user_id, tier, billing_cycle)` — sets emails_limit, ends_at, status in DB
- `downgrade_to_free(user_id)` — resets to free tier limits
- `get_price(tier, billing_cycle)` — returns price with discount applied
- `calculate_discount(billing_cycle)` — 0% / 5% / 10% / 15% / 20%

Pricing table:
```
Starter  1 month  = base price
Starter  3 months = base × 3 × 0.95
Pro      1 month  = base price
Pro      3 months = base × 3 × 0.90
Pro      6 months = base × 6 × 0.85
Business 1 month  = base price
Business 3 months = base × 3 × 0.90
Business 6 months = base × 6 × 0.85
Business 12 months = base × 12 × 0.80
```

---

### 3.4 — Routes

**File: `routes/payment_routes.py`**

Endpoints:
- `POST /payments/create-order` — creates order, returns payment data to frontend
- `POST /webhooks/payment` — gateway calls this on payment success/failure (no auth — gateway calls directly)
- `GET /payments/history` — user's payment history

---

### 3.5 — Expiry Cron Job

**File: `scripts/check_subscriptions.py`**

What it does:
- Runs daily (scheduled via Render cron or external cron service)
- Finds all subscriptions where `ends_at < now()`
- Downgrades expired users to free tier
- Sends expiry notification email via your own pipeline
- Finds subscriptions expiring in 3 days
- Sends warning email

---

### 3.6 — Subscription Enforcement Update

**File: `services/subscription_service.py` (update)**

What changes:
- Add customization tier checks:
  - `can_customize_tone(user_id)` — Free and above
  - `can_customize_style(user_id)` — Starter and above
  - `can_customize_categories(user_id)` — Pro and above
  - `can_use_approval_queue(user_id)` — Starter and above
  - `can_view_analytics(user_id)` — Pro and above
- Add billing cycle awareness
- Add `get_available_billing_cycles(tier)` — returns valid cycles per tier

---

---

# SECTION 4 — React Frontend
**Goal: Users can manage everything through a dashboard**

---

### 4.1 — Project Setup

**Stack:**
- React + Vite
- Tailwind CSS
- Axios for API calls
- React Router for navigation
- Zustand or Context for state

**File structure:**
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Onboarding.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Tickets.jsx
│   │   ├── TicketDetail.jsx
│   │   ├── Queue.jsx
│   │   ├── Filters.jsx
│   │   ├── Settings.jsx
│   │   ├── Subscription.jsx
│   │   └── Analytics.jsx
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── TicketCard.jsx
│   │   ├── QueueItem.jsx
│   │   ├── FilterForm.jsx
│   │   ├── ToneSelector.jsx
│   │   ├── StyleSelector.jsx
│   │   ├── BusinessTypeCard.jsx
│   │   └── SubscriptionCard.jsx
│   ├── services/
│   │   ├── api.js          ← axios instance with auth header
│   │   ├── auth.js
│   │   ├── tickets.js
│   │   ├── queue.js
│   │   ├── filters.js
│   │   ├── settings.js
│   │   ├── business.js
│   │   └── subscription.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useSubscription.js
│   └── App.jsx
```

---

### 4.2 — Pages

**Login / Register**
- Simple email + password forms
- JWT token stored in localStorage
- Redirect to onboarding if not complete, dashboard if complete

**Onboarding**
- Step 1: Connect Gmail (OAuth button)
- Step 2: Select business type (card grid)
- Step 3: Select tone + style (dropdowns)
- Step 4: Done — redirect to dashboard

**Dashboard**
- Summary stats: emails processed today, open tickets, pending approvals
- Recent tickets list
- Quick actions: toggle review mode, view queue

**Tickets**
- List of all tickets with status badges
- Filter by status (open, in_progress, resolved, closed)
- Click to open ticket detail

**Ticket Detail**
- Full conversation thread (inbound + outbound messages)
- Status update button
- Sender info, category, extracted data

**Queue (Approval Queue)**
- List of pending replies
- Each item shows: original email summary, generated reply
- Three buttons: Approve / Edit / Reject
- Edit opens inline text editor, Save sends immediately

**Filters**
- List of current whitelist/blacklist rules
- Add new filter form (type + pattern)
- Delete button per filter

**Settings**
- Review mode toggle
- Tone selector
- Style selector
- Business type selector
- Gmail connection status + reconnect button

**Subscription**
- Current plan display
- Usage bar (emails used / limit)
- Upgrade options with pricing
- Billing cycle selector with discount display
- Payment button

**Analytics (Pro+)**
- Emails processed per day chart
- Category distribution pie chart
- Reply rate
- Average response time
- Model usage breakdown

---

---

# SECTION 5 — Celery + Redis Task Queue
**Goal: Process emails asynchronously so API never blocks**

---

### 5.1 — When To Build This

Build this when:
- You have 20+ concurrent users
- `/gmail/push` is timing out under load
- Render logs show memory pressure during email bursts

Do not build this before you need it.

---

### 5.2 — Infrastructure

- Add Redis on Render (paid add-on) or use Upstash Redis (free tier available)
- Add Celery worker as separate Render service

---

### 5.3 — Files

**File: `celery_app.py`**
- Celery app instance
- Redis broker configuration
- Task routing configuration

**File: `tasks/email_tasks.py`**

What it does:
- `process_email_task(sender_email, subject, body, user_id, message_id)` — Celery task that runs the full pipeline
- `classify_task(email_data)` — classification subtask
- `extract_task(email_data)` — extraction subtask
- `generate_task(email_data, extracted)` — generation subtask
- `send_task(reply_data, user_id)` — Gmail send subtask
- Tasks chained: classify → extract → generate → send
- Dead letter queue for permanently failed tasks

**File: `routes/email_routes.py` (update)**

What changes:
- `/process-email` returns `202 Accepted` with `task_id` immediately
- `/gmail/push` dispatches task instead of running pipeline directly

**File: `routes/task_routes.py`**

Endpoints:
- `GET /tasks/{task_id}` — returns task status and result when ready

---

---

# SECTION 6 — Telegram Integration
**Goal: Optional per-user Telegram bot for approval workflow**

---

### 6.1 — Supabase Table

`telegram_settings`
- `user_id` — foreign key
- `bot_token` — user's own Telegram bot token
- `chat_id` — user's Telegram chat ID
- `enabled` — boolean toggle

---

### 6.2 — Service

**File: `services/telegram_service.py`**

What it does:
- `send_approval_request(user_id, queue_item)` — sends generated reply preview to user's Telegram with 3 inline buttons
- `handle_callback(callback_data)` — processes button press from Telegram
- `send_notification(user_id, message)` — sends plain notification
- Buttons: ✅ Approve / ✏️ Edit / ❌ Reject
- On Approve → calls `approval_service.approve(queue_id)`
- On Reject → calls `approval_service.reject(queue_id)`
- On Edit → sends message asking user to reply with edited text, then sends

---

### 6.3 — Routes

**File: `routes/telegram_routes.py`**

Endpoints:
- `POST /telegram/connect` — save bot token and chat ID
- `DELETE /telegram/disconnect` — remove settings
- `GET /telegram/status` — check if connected
- `POST /telegram/webhook` — Telegram calls this on button press or message reply

---

### 6.4 — Wire Into Pipeline

**File: `services/email_pipeline_service.py` (update)**

What changes:
- After queuing reply in approval queue, check if user has Telegram connected
- If yes → send Telegram notification with approve/edit/reject buttons
- If no → reply just sits in queue for web dashboard approval

---

---

# SECTION 7 — Monitoring & Alerting
**Goal: Know when something breaks before users tell you**

---

### 7.1 — Files

**File: `services/monitoring_service.py`**

What it does:
- `log_email_processed(user_id, category, model_used, duration_ms)` — stores processing metrics
- `log_llm_failure(provider, model, error)` — tracks model failures
- `log_pipeline_error(user_id, error, stage)` — tracks where pipeline fails
- `get_daily_stats(user_id)` — aggregates metrics for analytics dashboard

**File: `scripts/health_check.py`**

What it does:
- Pings all LLM providers
- Checks Supabase connection
- Checks Gmail API
- Returns health report
- Can be called by external uptime monitor (UptimeRobot / BetterUptime)

---

---

# SECTION 8 — Google App Verification
**Goal: Remove "unverified app" warning for users connecting Gmail**

Not a code task. Steps:

1. Get a real domain (not `.onrender.com`)
2. Host privacy policy at `yourdomain.com/privacy`
3. Host terms of service at `yourdomain.com/terms`
4. Go to Google Cloud Console → OAuth consent screen
5. Submit for verification
6. Wait 1-3 weeks
7. After approval — users see clean consent screen with no warnings

---

---

# Complete Build Order Summary

```
Section 1 — Business Profiles          ← BUILD NOW
    SQL tables
    Seed script
    business_service.py
    business_routes.py
    Pipeline integration

Section 2 — Per-User Gmail OAuth       ← NEXT
    SQL table
    gmail_oauth_service.py
    gmail_oauth_routes.py
    Gmail service update
    Pipeline update

Section 3 — Payment Integration        ← AFTER OAUTH
    Choose Razorpay or Stripe
    payment_service.py
    payment_routes.py
    Expiry cron job
    Subscription enforcement update

Section 4 — React Frontend             ← PARALLEL WITH PAYMENT
    Project setup
    All pages
    All components
    API service layer

Section 5 — Celery + Redis             ← WHEN NEEDED
    Only when load justifies it
    celery_app.py
    email_tasks.py
    task_routes.py

Section 6 — Telegram Integration       ← AFTER FRONTEND
    telegram_service.py
    telegram_routes.py
    Pipeline update

Section 7 — Monitoring                 ← BEFORE PUBLIC LAUNCH
    monitoring_service.py
    health_check.py

Section 8 — Google Verification        ← BEFORE PUBLIC LAUNCH
    Non-code submission process
```

---

# Pre-Launch Checklist

```
□ Business profiles working
□ Per-user Gmail OAuth working
□ Google app verified
□ Payment integration live
□ React frontend complete
□ Real domain configured
□ Privacy policy live
□ Terms of service live
□ Subscription enforcement tested
□ Expiry cron job running
□ Monitoring in place
□ All CI tests passing
□ Load tested with 10+ concurrent users
```
