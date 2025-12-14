-- Migration: 019_user_accounts
-- Description: Minimal user accounts table for storing preferences
-- Note: Full authentication/authorization not implemented yet

-- User accounts table (minimal for preferences)
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifier (for now just a string, can be email/oauth later)
  identifier TEXT NOT NULL UNIQUE,
  
  -- Display name (optional)
  display_name TEXT,
  
  -- User preferences stored as JSONB
  -- Structure: { workspaceMode: 'wizard' | 'compact', ... }
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick identifier lookup
CREATE INDEX IF NOT EXISTS idx_user_accounts_identifier ON user_accounts(identifier);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_accounts_updated_at ON user_accounts;
CREATE TRIGGER trigger_user_accounts_updated_at
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_accounts_updated_at();

-- Create default user for single-user mode
INSERT INTO user_accounts (identifier, display_name, preferences)
VALUES ('default', 'Default User', '{"workspaceMode": "wizard"}'::jsonb)
ON CONFLICT (identifier) DO NOTHING;
