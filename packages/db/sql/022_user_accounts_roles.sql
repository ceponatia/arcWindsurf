-- Migration: 022_user_accounts_roles
-- Description: Add roles + auth fields to user_accounts for future Supabase integration.

-- Add role + auth-related columns
ALTER TABLE user_accounts
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Indexes for role checks and future auth lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON user_accounts(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_accounts_supabase_user_id_unique
  ON user_accounts(supabase_user_id)
  WHERE supabase_user_id IS NOT NULL;

-- Ensure an admin user exists (password_hash is set by application code)
INSERT INTO user_accounts (identifier, display_name, preferences, role, auth_provider)
VALUES ('admin', 'Admin', '{}'::jsonb, 'admin', 'local')
ON CONFLICT (identifier) DO UPDATE
  SET role = EXCLUDED.role;
