-- Bring `user_accounts` schema in line with the runtime user-preferences implementation.
--
-- Historical note: early schema used `email` + `roles[]`. The current code paths
-- use a simpler identifier-based account model with JSONB preferences.

ALTER TABLE user_accounts
  ADD COLUMN IF NOT EXISTS identifier TEXT,
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS supabase_user_id TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Backfill identifier from email for any existing rows.
UPDATE user_accounts
SET identifier = COALESCE(identifier, email)
WHERE identifier IS NULL;

-- Identifier is required by the app-level DB repositories.
ALTER TABLE user_accounts
  ALTER COLUMN identifier SET NOT NULL;

-- The app creates users without an email in local single-user mode.
ALTER TABLE user_accounts
  ALTER COLUMN email DROP NOT NULL;

-- Ensure ON CONFLICT (identifier) works.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_accounts_identifier_key'
  ) THEN
    ALTER TABLE user_accounts
      ADD CONSTRAINT user_accounts_identifier_key UNIQUE (identifier);
  END IF;
END $$;
