# Frontend Tracker — Email AI Service

---

## Current Status
- Frontend: Next.js 15, running locally at `http://localhost:3000`
- Backend: Deployed at `https://emailservice-pr-1.onrender.com` (branch: `feature/multi-tenant`)
- Auth: Supabase Auth UI (email/password)
- Gmail OAuth: Working ✅

---

## Known Limitations

### Celery Worker (Email Processing)
- Running in `--pool=solo --concurrency=1` mode inside the same Docker container as uvicorn
- Processes **one email at a time** sequentially
- Fine for ~50 users with low email volume
- If emails arrive simultaneously they queue up — 10 simultaneous emails = last one waits ~100s
- **To scale:** Upgrade to Render $7/month Background Worker + switch back to prefork pool

### Free Tier (Render 512MB RAM)
- Both uvicorn + celery must fit in 512MB
- Solo pool uses ~30MB for Celery vs ~400MB for default prefork (8 workers)
- If OOM errors return, set `WEB_CONCURRENCY=1` in Render env vars

---

## Environment Variables (Render — emailservice-pr-1)
| Variable | Notes |
|---|---|
| `GOOGLE_REDIRECT_URI` | `https://emailservice-pr-1.onrender.com/auth/gmail/callback` |
| `FRONTEND_URL` | `http://localhost:3000` — update when frontend is deployed |
| `ALLOWED_ORIGINS` | `http://localhost:3000` — update when frontend is deployed |
| `GOOGLE_CLIENT_ID` | Same value as `GMAIL_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` | Same value as `GMAIL_CLIENT_SECRET` |
| `REDIS_URL` | Must be `rediss://...` — no `redis-cli --tls -u` prefix |
| `CELERY_RESULT_BACKEND` | Must be `rediss://...` — no `redis-cli --tls -u` prefix |

---

## Supabase Tables Required
```sql
-- Add is_admin column if missing
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create gmail_oauth_tokens if missing
CREATE TABLE IF NOT EXISTS public.gmail_oauth_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  refresh_token text NOT NULL,
  access_token text,
  sender_email text,
  token_expiry timestamptz,
  updated_at timestamptz DEFAULT now()
);
```

---

## Google Cloud Console
- OAuth client type must be **Web application** (not Desktop)
- Authorized redirect URIs must include:
  - `https://emailservice-pr-1.onrender.com/auth/gmail/callback`
  - Add production frontend URL when deploying

---

## Frontend Pages Built
| Route | Status |
|---|---|
| `/login` | ✅ Supabase Auth UI |
| `/dashboard` | ✅ Stats + recent tickets |
| `/tickets` | ✅ List + status update |
| `/tickets/[id]` | ✅ Detail + status change |
| `/queue` | ✅ Approve / reject / edit replies |
| `/filters` | ✅ Whitelist / blacklist CRUD |
| `/settings` | ✅ Gmail connect, review mode, business profile |
| `/subscription` | ✅ Usage + plan comparison |
| `/analytics` | ✅ Bar + pie charts (Recharts) |
| `/onboarding` | ✅ Business type → Gmail connect |
| `/admin` | ✅ Stats + user upgrade (admin only, hidden for regular users) |

---

## Important Field Name Mappings (Backend → Frontend)
- Business profile type field: `preset_type_key` (not `business_type`)
- Tone override field: `tone_override` (not `tone`)
- Style override field: `style_override` (not `style`)
- Preset display label: `name` (not `display_name`)
- Admin flag: `is_admin` in `user_settings` table

---

## To Do / Future
- [ ] Deploy frontend to Vercel — then update `FRONTEND_URL` and `ALLOWED_ORIGINS` on Render
- [ ] Configure Gmail Pub/Sub push subscription to point to `https://emailservice-pr-1.onrender.com`
- [ ] Set up daily cron job calling `/system/renew-watches` — Gmail watch expires every 7 days
- [ ] Submit Google OAuth app for verification to remove "unverified app" warning screen
- [ ] Upgrade Celery to a dedicated worker service when scaling beyond ~50 users


## Known Backend Issues (Fix Before Multi-User Launch)

### `gmail_watch_state` is single-tenant — CRITICAL
- Table originally had a `single_row` check constraint (now dropped manually)
- Only one row exists — multiple users will collide on the same history ID
- User A's email push will read/write User B's `last_history_id`, causing missed or duplicate processing
- **Fix required:**
  - Remove `single_row` constraint permanently (already done via SQL)
  - Ensure `get_last_history_id(user_id)` and `update_last_history_id(history_id, user_id)` always filter by `user_id` — code already does this correctly
  - The startup `watch_inbox()` in `main.py` stores under `user_id="system"` — this row is now orphaned and unused for real users
  - Each connected user needs their own row inserted on Gmail connect

---

## Completed Optimizations & Layout Fixes
- **Tailwind v4 Theme Variable Integration**: Changed `@theme inline` to `@theme` and updated `@custom-variant dark (&:where(.dark, .dark *))` in [globals.css](file:///D:/machine%20learning/LangchainEmailServiceProject/frontend/app/globals.css). This enables dynamic dark mode support at runtime.
- **Eye-Friendly Dark Theme Styles**: Custom scrollbars, sticker shadows, and scribble underlines configured to use CSS variables. Added a dark override for scribble underlines to switch from deep purple to soft pink.
- **Removed Duplicate Feature Keys**: Reconfigured [pricing/page.tsx](file:///D:/machine%20learning/LangchainEmailServiceProject/frontend/app/(dashboard)/pricing/page.tsx) to remove duplicate key warnings (such as the duplicate `'Custom AI training'` item under the Enterprise tier).
- **Navigation adjustments**: Settings page (`/settings`) is excluded from the Email Service navbar and route classification list in [TopAppBar.tsx](file:///D:/machine%20learning/LangchainEmailServiceProject/frontend/components/TopAppBar.tsx) so that it renders using the main dashboard navbar and is accessible only through the user profile dropdown.
- **Settings Card Design**: Restructured the AI Theme preference options into a 2-column grid and enlarged the buttons/inputs. Re-designed the Appearance selector buttons by removing the outer box containers and setting the system theme preview box to a solid gray background (`bg-gray-200` / `dark:bg-neutral-800`).
- **No Direct Database access**: Enforced zero direct database operations in the frontend (Supabase Client query calls replaced with FastAPI REST API endpoints).
