ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_grace_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_provider_updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_provider_event_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_reconciliation_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS checkout_pending_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS checkout_pending_token UUID;

CREATE TABLE IF NOT EXISTS stripe_event_receipts (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  provider_created_at TIMESTAMPTZ NOT NULL,
  livemode BOOLEAN NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  error_code VARCHAR(80),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stripe_event_receipts_status_updated_idx
  ON stripe_event_receipts(status, updated_at);

