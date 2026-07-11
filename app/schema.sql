CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255),
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  subscription_price_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

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
