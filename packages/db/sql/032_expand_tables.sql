-- Phase 2: Expand Existing Tables
-- As per dev-docs/database-migration-refactor.md

-- Expand user_sessions
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'singleplayer';
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS event_seq BIGINT DEFAULT 0;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

-- Expand character_profiles
ALTER TABLE character_profiles ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE character_profiles ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';
ALTER TABLE character_profiles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE character_profiles ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE character_profiles ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Expand setting_profiles
ALTER TABLE setting_profiles ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE setting_profiles ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';
ALTER TABLE setting_profiles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE setting_profiles ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE setting_profiles ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Expand messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'chat';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tool_calls JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id TEXT;
