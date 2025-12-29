-- NPC transcript visibility: track which NPCs witnessed each turn
-- Adds witnessed_by array and indexes for owner/session/time filtering

ALTER TABLE npc_messages
  ADD COLUMN IF NOT EXISTS witnessed_by TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_npc_messages_witnessed_by
  ON npc_messages USING GIN (witnessed_by);

CREATE INDEX IF NOT EXISTS idx_npc_messages_owner_session_idx
  ON npc_messages(owner_email, session_id, idx);
