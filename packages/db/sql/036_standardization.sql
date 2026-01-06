-- Phase 6: Standardization
-- As per dev-docs/database-migration-refactor.md

-- Standardize ID types (Audit and fix UUID vs TEXT usage)
-- We prefer UUID for system-generated IDs and TEXT for human-readable IDs.

-- prompt_tags (Currently TEXT, keep as TEXT for human-readable IDs like 'combat')
-- session_tag_bindings (Currently TEXT, keep as TEXT)

-- user_accounts (Currently UUID, standard)
-- schedule_templates (Currently UUID, standard)
-- npc_schedules (Currently UUID, standard)

-- character_instances (Currently TEXT, convert to UUID for system-generated)
ALTER TABLE character_instances ALTER COLUMN id SET DATA TYPE UUID USING id::uuid;
ALTER TABLE character_instances ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- setting_instances (Currently TEXT, convert to UUID for system-generated)
ALTER TABLE setting_instances ALTER COLUMN id SET DATA TYPE UUID USING id::uuid;
ALTER TABLE setting_instances ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- item_instances (Currently TEXT, convert to UUID for system-generated)
ALTER TABLE item_instances ALTER COLUMN id SET DATA TYPE UUID USING id::uuid;
ALTER TABLE item_instances ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- npc_messages (Currently TEXT, convert to UUID for system-generated)
ALTER TABLE npc_messages ALTER COLUMN id SET DATA TYPE UUID USING id::uuid;
ALTER TABLE npc_messages ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- session_npc_location_state (Currently TEXT, convert to UUID for system-generated)
ALTER TABLE session_npc_location_state ALTER COLUMN id SET DATA TYPE UUID USING id::uuid;
ALTER TABLE session_npc_location_state ALTER COLUMN id SET DEFAULT gen_random_uuid();
