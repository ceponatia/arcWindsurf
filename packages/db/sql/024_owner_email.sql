-- Migration 024: Ownership + Authorization (private-by-default)
--
-- Adds owner_email to session-linked tables and enforces same-owner references
-- via composite foreign keys.
--
-- Notes:
-- - Sessions are never public.
-- - This migration assumes no existing rows (Fly fresh deploy).

-- ---------------------------------------------------------------------------
-- user_sessions (core)
-- ---------------------------------------------------------------------------

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_no_public_owner
  CHECK (owner_email <> 'public');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_sessions_id_owner
  ON user_sessions(id, owner_email);

CREATE INDEX IF NOT EXISTS idx_user_sessions_owner_created
  ON user_sessions(owner_email, created_at DESC);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE messages
  ADD CONSTRAINT messages_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE messages
  ADD CONSTRAINT messages_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_session_id_fkey;

ALTER TABLE messages
  ADD CONSTRAINT fk_messages_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_owner_session_idx
  ON messages(owner_email, session_id, idx);

-- ---------------------------------------------------------------------------
-- npc_messages
-- ---------------------------------------------------------------------------

ALTER TABLE npc_messages
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE npc_messages
  ADD CONSTRAINT npc_messages_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE npc_messages
  ADD CONSTRAINT npc_messages_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE npc_messages
  DROP CONSTRAINT IF EXISTS npc_messages_session_id_fkey;

ALTER TABLE npc_messages
  ADD CONSTRAINT fk_npc_messages_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_npc_messages_owner_session_npc_idx
  ON npc_messages(owner_email, session_id, npc_id, idx);

-- ---------------------------------------------------------------------------
-- character_instances
-- ---------------------------------------------------------------------------

ALTER TABLE character_instances
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE character_instances
  ADD CONSTRAINT character_instances_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE character_instances
  ADD CONSTRAINT character_instances_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE character_instances
  DROP CONSTRAINT IF EXISTS character_instances_session_id_fkey;

ALTER TABLE character_instances
  ADD CONSTRAINT fk_character_instances_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_character_instances_owner_session
  ON character_instances(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- setting_instances
-- ---------------------------------------------------------------------------

ALTER TABLE setting_instances
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE setting_instances
  ADD CONSTRAINT setting_instances_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE setting_instances
  ADD CONSTRAINT setting_instances_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE setting_instances
  DROP CONSTRAINT IF EXISTS setting_instances_session_id_fkey;

ALTER TABLE setting_instances
  ADD CONSTRAINT fk_setting_instances_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_setting_instances_owner_session
  ON setting_instances(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_history
-- ---------------------------------------------------------------------------

ALTER TABLE session_history
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_history
  ADD CONSTRAINT session_history_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_history
  ADD CONSTRAINT session_history_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_history
  DROP CONSTRAINT IF EXISTS session_history_session_id_fkey;

ALTER TABLE session_history
  ADD CONSTRAINT fk_session_history_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_history_owner_session_turn
  ON session_history(owner_email, session_id, turn_idx);

-- ---------------------------------------------------------------------------
-- state_change_log
-- ---------------------------------------------------------------------------

ALTER TABLE state_change_log
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE state_change_log
  ADD CONSTRAINT state_change_log_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE state_change_log
  ADD CONSTRAINT state_change_log_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE state_change_log
  DROP CONSTRAINT IF EXISTS state_change_log_session_id_fkey;

ALTER TABLE state_change_log
  ADD CONSTRAINT fk_state_change_log_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_state_change_log_owner_session_created
  ON state_change_log(owner_email, session_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- tool_call_history
-- ---------------------------------------------------------------------------

ALTER TABLE tool_call_history
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE tool_call_history
  ADD CONSTRAINT tool_call_history_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE tool_call_history
  ADD CONSTRAINT tool_call_history_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE tool_call_history
  DROP CONSTRAINT IF EXISTS tool_call_history_session_id_fkey;

ALTER TABLE tool_call_history
  ADD CONSTRAINT fk_tool_call_history_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tool_call_history_owner_session_turn
  ON tool_call_history(owner_email, session_id, turn_idx DESC);

-- ---------------------------------------------------------------------------
-- conversation_summaries
-- ---------------------------------------------------------------------------

ALTER TABLE conversation_summaries
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE conversation_summaries
  ADD CONSTRAINT conversation_summaries_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE conversation_summaries
  ADD CONSTRAINT conversation_summaries_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE conversation_summaries
  DROP CONSTRAINT IF EXISTS conversation_summaries_session_id_fkey;

ALTER TABLE conversation_summaries
  ADD CONSTRAINT fk_conversation_summaries_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_owner_session
  ON conversation_summaries(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_location_state
-- ---------------------------------------------------------------------------

ALTER TABLE session_location_state
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_location_state
  ADD CONSTRAINT session_location_state_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_location_state
  ADD CONSTRAINT session_location_state_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_location_state
  DROP CONSTRAINT IF EXISTS session_location_state_session_id_fkey;

ALTER TABLE session_location_state
  ADD CONSTRAINT fk_session_location_state_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_location_state_owner_session
  ON session_location_state(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_inventory_state
-- ---------------------------------------------------------------------------

ALTER TABLE session_inventory_state
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_inventory_state
  ADD CONSTRAINT session_inventory_state_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_inventory_state
  ADD CONSTRAINT session_inventory_state_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_inventory_state
  DROP CONSTRAINT IF EXISTS session_inventory_state_session_id_fkey;

ALTER TABLE session_inventory_state
  ADD CONSTRAINT fk_session_inventory_state_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_inventory_state_owner_session
  ON session_inventory_state(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_time_state
-- ---------------------------------------------------------------------------

ALTER TABLE session_time_state
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_time_state
  ADD CONSTRAINT session_time_state_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_time_state
  ADD CONSTRAINT session_time_state_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_time_state
  DROP CONSTRAINT IF EXISTS session_time_state_session_id_fkey;

ALTER TABLE session_time_state
  ADD CONSTRAINT fk_session_time_state_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_time_state_owner_session
  ON session_time_state(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- scene_actions
-- ---------------------------------------------------------------------------

ALTER TABLE scene_actions
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE scene_actions
  ADD CONSTRAINT scene_actions_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE scene_actions
  ADD CONSTRAINT scene_actions_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE scene_actions
  DROP CONSTRAINT IF EXISTS scene_actions_session_id_fkey;

ALTER TABLE scene_actions
  ADD CONSTRAINT fk_scene_actions_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_scene_actions_owner_session
  ON scene_actions(owner_email, session_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- session_affinity_state
-- ---------------------------------------------------------------------------

ALTER TABLE session_affinity_state
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_affinity_state
  ADD CONSTRAINT session_affinity_state_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_affinity_state
  ADD CONSTRAINT session_affinity_state_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_affinity_state
  DROP CONSTRAINT IF EXISTS session_affinity_state_session_id_fkey;

ALTER TABLE session_affinity_state
  ADD CONSTRAINT fk_session_affinity_state_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_affinity_state_owner_session
  ON session_affinity_state(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_npc_location_state
-- ---------------------------------------------------------------------------

ALTER TABLE session_npc_location_state
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_npc_location_state
  ADD CONSTRAINT session_npc_location_state_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_npc_location_state
  ADD CONSTRAINT session_npc_location_state_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_npc_location_state
  DROP CONSTRAINT IF EXISTS session_npc_location_state_session_id_fkey;

ALTER TABLE session_npc_location_state
  ADD CONSTRAINT fk_session_npc_location_state_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_npc_location_state_owner_session
  ON session_npc_location_state(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_npc_simulation_cache
-- ---------------------------------------------------------------------------

ALTER TABLE session_npc_simulation_cache
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_npc_simulation_cache
  ADD CONSTRAINT session_npc_simulation_cache_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_npc_simulation_cache
  ADD CONSTRAINT session_npc_simulation_cache_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_npc_simulation_cache
  DROP CONSTRAINT IF EXISTS session_npc_simulation_cache_session_id_fkey;

ALTER TABLE session_npc_simulation_cache
  ADD CONSTRAINT fk_session_npc_simulation_cache_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_npc_simulation_cache_owner_session
  ON session_npc_simulation_cache(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_location_occupancy_cache
-- ---------------------------------------------------------------------------

ALTER TABLE session_location_occupancy_cache
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_location_occupancy_cache
  ADD CONSTRAINT session_location_occupancy_cache_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_location_occupancy_cache
  ADD CONSTRAINT session_location_occupancy_cache_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_location_occupancy_cache
  DROP CONSTRAINT IF EXISTS session_location_occupancy_cache_session_id_fkey;

ALTER TABLE session_location_occupancy_cache
  ADD CONSTRAINT fk_session_location_occupancy_cache_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_location_occupancy_cache_owner_session
  ON session_location_occupancy_cache(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_player_interest
-- ---------------------------------------------------------------------------

ALTER TABLE session_player_interest
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_player_interest
  ADD CONSTRAINT session_player_interest_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_player_interest
  ADD CONSTRAINT session_player_interest_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_player_interest
  DROP CONSTRAINT IF EXISTS session_player_interest_session_id_fkey;

ALTER TABLE session_player_interest
  ADD CONSTRAINT fk_session_player_interest_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_player_interest_owner_session
  ON session_player_interest(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- npc_hygiene_state
-- ---------------------------------------------------------------------------

ALTER TABLE npc_hygiene_state
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE npc_hygiene_state
  ADD CONSTRAINT npc_hygiene_state_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE npc_hygiene_state
  ADD CONSTRAINT npc_hygiene_state_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE npc_hygiene_state
  DROP CONSTRAINT IF EXISTS npc_hygiene_state_session_id_fkey;

ALTER TABLE npc_hygiene_state
  ADD CONSTRAINT fk_npc_hygiene_state_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_npc_hygiene_state_owner_session_npc
  ON npc_hygiene_state(owner_email, session_id, npc_id);

-- ---------------------------------------------------------------------------
-- npc_schedules
-- ---------------------------------------------------------------------------

ALTER TABLE npc_schedules
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE npc_schedules
  ADD CONSTRAINT npc_schedules_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE npc_schedules
  ADD CONSTRAINT npc_schedules_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE npc_schedules
  DROP CONSTRAINT IF EXISTS npc_schedules_session_id_fkey;

ALTER TABLE npc_schedules
  ADD CONSTRAINT fk_npc_schedules_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_npc_schedules_owner_session
  ON npc_schedules(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- item_instances
-- ---------------------------------------------------------------------------

ALTER TABLE item_instances
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE item_instances
  ADD CONSTRAINT item_instances_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE item_instances
  ADD CONSTRAINT item_instances_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE item_instances
  DROP CONSTRAINT IF EXISTS item_instances_session_id_fkey;

ALTER TABLE item_instances
  ADD CONSTRAINT fk_item_instances_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_item_instances_owner_session
  ON item_instances(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_tag_bindings
-- ---------------------------------------------------------------------------

ALTER TABLE session_tag_bindings
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_tag_bindings
  ADD CONSTRAINT session_tag_bindings_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_tag_bindings
  ADD CONSTRAINT session_tag_bindings_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_tag_bindings
  DROP CONSTRAINT IF EXISTS session_tag_bindings_session_id_fkey;

ALTER TABLE session_tag_bindings
  ADD CONSTRAINT fk_session_tag_bindings_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_tag_bindings_owner_session
  ON session_tag_bindings(owner_email, session_id);

-- ---------------------------------------------------------------------------
-- session_personas
-- ---------------------------------------------------------------------------

ALTER TABLE session_personas
  ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL;

ALTER TABLE session_personas
  ADD CONSTRAINT session_personas_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE session_personas
  ADD CONSTRAINT session_personas_no_public_owner
  CHECK (owner_email <> 'public');

ALTER TABLE session_personas
  DROP CONSTRAINT IF EXISTS session_personas_session_id_fkey;

ALTER TABLE session_personas
  ADD CONSTRAINT fk_session_personas_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_session_personas_owner_session
  ON session_personas(owner_email, session_id);
