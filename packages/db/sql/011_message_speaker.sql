-- Add speaker metadata columns to messages table
-- This enables persisting NPC name and avatar with assistant messages

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS speaker_id TEXT,
  ADD COLUMN IF NOT EXISTS speaker_name TEXT,
  ADD COLUMN IF NOT EXISTS speaker_profile_pic TEXT;

-- Index for efficient queries by speaker
CREATE INDEX IF NOT EXISTS idx_messages_speaker_id ON messages(speaker_id);

COMMENT ON COLUMN messages.speaker_id IS 'Character template ID of the NPC who spoke';
COMMENT ON COLUMN messages.speaker_name IS 'Display name of the speaker at time of message';
COMMENT ON COLUMN messages.speaker_profile_pic IS 'Profile picture URL of the speaker at time of message';
