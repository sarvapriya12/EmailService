-- 1. Create payment status enum type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'
    );
  END IF;
END $$;

-- 2. Create payment intents table
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_paise    BIGINT NOT NULL,               -- store amount in paise (e.g., 9900 for ₹99)
  currency        CHAR(3) NOT NULL DEFAULT 'INR',
  status          payment_status NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT UNIQUE NOT NULL,          -- client-supplied deduplication key
  qr_payload      TEXT NOT NULL,                 -- PhonePe merchant QR payload / instrument link
  gateway_ref     TEXT,                          -- PhonePe merchantTransactionId
  provider_ref    TEXT,                          -- PhonePe providerReference / UTR
  user_id         UUID NOT NULL,                 -- references auth.users(id)
  plan_id         TEXT NOT NULL,
  payment_type    TEXT NOT NULL DEFAULT 'PLAN_PURCHASE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,          -- TTL (typically 2 minutes)
  completed_at    TIMESTAMPTZ,
  version         INT NOT NULL DEFAULT 0         -- optimistic concurrency lock
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status_expires ON public.payment_intents (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_intents_gateway_ref ON public.payment_intents (gateway_ref);

-- 3. Create webhook events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL,
  gateway_event_id TEXT UNIQUE,                  -- PhonePe unique response transaction ID or event ID
  raw_payload     JSONB NOT NULL,
  signature       TEXT,
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Extend subscriptions table to include payment intent history, billing cycle, and cancel reasons
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS payment_intent_id UUID,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS renews_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by_user BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;

-- 5. Create plan purchases history (audit log)
CREATE TABLE IF NOT EXISTS public.plan_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                         -- references auth.users(id)
  old_plan_id TEXT,                              -- NULL if first purchase
  new_plan_id TEXT NOT NULL,
  payment_intent_id UUID NOT NULL REFERENCES public.payment_intents(id),
  action_type TEXT NOT NULL,                     -- 'NEW_PURCHASE', 'UPGRADE', 'DOWNGRADE', 'RENEWAL'
  amount_paid DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL,                          -- 'COMPLETED', 'FAILED'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
