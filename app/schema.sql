CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255),
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  subscription_price_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS stripe_event_receipts_status_updated_idx ON stripe_event_receipts(status, updated_at);

CREATE TABLE IF NOT EXISTS recordings (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  name VARCHAR(255),
  duration_ms INT,
  size_bytes INT,
  mode VARCHAR(50),
  local_file_path TEXT,
  mime_type VARCHAR(100) DEFAULT 'audio/webm',
  state VARCHAR(50) DEFAULT 'uploaded',
  processing_error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE recordings ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) DEFAULT 'audio/webm';
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'uploaded';
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS processing_error TEXT;
CREATE INDEX IF NOT EXISTS recordings_user_created_idx ON recordings(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id VARCHAR(255) REFERENCES recordings(id) ON DELETE CASCADE,
  provider VARCHAR(50),
  markdown TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

DELETE FROM transcripts older
USING transcripts newer
WHERE older.recording_id = newer.recording_id
  AND older.provider = newer.provider
  AND (older.created_at, older.id) < (newer.created_at, newer.id);
CREATE UNIQUE INDEX IF NOT EXISTS transcripts_recording_provider_idx ON transcripts(recording_id, provider);

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id VARCHAR(255) REFERENCES recordings(id) ON DELETE CASCADE,
  json_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES users(id),
  resource_type VARCHAR(50), 
  provider VARCHAR(50), 
  quantity NUMERIC, 
  estimated_cost_usd NUMERIC(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  config JSONB NOT NULL,
  insight_model TEXT NOT NULL,
  supervisor_model TEXT NOT NULL,
  prompt_hash VARCHAR(64) NOT NULL,
  prompt_snapshot TEXT NOT NULL,
  summary JSONB,
  prompt_review JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eval_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES eval_runs(id) ON DELETE CASCADE,
  position INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  scenario JSONB,
  transcript TEXT,
  analysis JSONB,
  deterministic_checks JSONB,
  judgment JSONB,
  metrics JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
ALTER TABLE eval_runs ADD COLUMN IF NOT EXISTS prompt_review JSONB;
CREATE INDEX IF NOT EXISTS eval_runs_user_created_idx ON eval_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS eval_cases_run_position_idx ON eval_cases(run_id, position);
