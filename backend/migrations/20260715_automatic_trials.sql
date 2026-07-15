ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_plan_key VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_trial_window_valid'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_trial_window_valid CHECK (
      (trial_plan_key IS NULL AND trial_started_at IS NULL AND trial_ends_at IS NULL)
      OR (
        trial_plan_key IS NOT NULL
        AND trial_started_at IS NOT NULL
        AND trial_ends_at = trial_started_at + INTERVAL '7 days'
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_trial_ends_at_idx
  ON users(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;
