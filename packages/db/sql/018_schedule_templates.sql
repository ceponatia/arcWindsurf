-- Migration 018: Schedule Templates
-- Stores reusable schedule templates for NPC daily routines.
-- Templates use placeholder location IDs (prefixed with $) that are resolved
-- when applying the template to a specific NPC in a session.

CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    -- JSON blob containing the full template structure including slots, default slot, and overrides
    template_data JSONB NOT NULL,
    -- Required placeholders that must be provided when applying this template
    required_placeholders TEXT[] NOT NULL DEFAULT '{}',
    -- Whether this is a built-in system template (cannot be deleted)
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient name lookup
CREATE INDEX IF NOT EXISTS idx_schedule_templates_name ON schedule_templates(name);

-- Index for system vs user templates
CREATE INDEX IF NOT EXISTS idx_schedule_templates_is_system ON schedule_templates(is_system);

-- NPC schedule instances - resolved schedules for specific NPCs in sessions
CREATE TABLE IF NOT EXISTS npc_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    npc_id VARCHAR(100) NOT NULL,
    -- Optional reference to the template used to generate this schedule
    template_id UUID REFERENCES schedule_templates(id) ON DELETE SET NULL,
    -- The resolved schedule with actual location IDs
    schedule_data JSONB NOT NULL,
    -- Map of placeholder key to resolved location ID (for reference)
    placeholder_mappings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Each NPC can only have one schedule per session
    UNIQUE(session_id, npc_id)
);

-- Index for efficient session lookup
CREATE INDEX IF NOT EXISTS idx_npc_schedules_session ON npc_schedules(session_id);

-- Index for NPC lookup within a session
CREATE INDEX IF NOT EXISTS idx_npc_schedules_npc ON npc_schedules(session_id, npc_id);

-- Update trigger for schedule_templates
CREATE OR REPLACE FUNCTION update_schedule_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_templates_update_timestamp
    BEFORE UPDATE ON schedule_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_templates_timestamp();

-- Update trigger for npc_schedules
CREATE OR REPLACE FUNCTION update_npc_schedules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER npc_schedules_update_timestamp
    BEFORE UPDATE ON npc_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_npc_schedules_timestamp();

-- Seed built-in schedule templates from the schema defaults
-- These match the templates in packages/schemas/src/schedule/defaults.ts
INSERT INTO schedule_templates (id, name, description, template_data, required_placeholders, is_system)
VALUES
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Shopkeeper',
    'Standard shopkeeper schedule with regular business hours',
    '{
        "id": "template-shopkeeper",
        "name": "Shopkeeper",
        "slots": [
            {"id": "shop-morning", "startTime": {"hour": 8, "minute": 0}, "endTime": {"hour": 12, "minute": 0}, "destination": {"type": "fixed", "locationId": "$workLocation"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "shop-lunch", "startTime": {"hour": 12, "minute": 0}, "endTime": {"hour": 13, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "shop-afternoon", "startTime": {"hour": 13, "minute": 0}, "endTime": {"hour": 18, "minute": 0}, "destination": {"type": "fixed", "locationId": "$workLocation"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "shop-evening", "startTime": {"hour": 18, "minute": 0}, "endTime": {"hour": 21, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "shop-sleep", "startTime": {"hour": 21, "minute": 0}, "endTime": {"hour": 8, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}
    }',
    ARRAY['workLocation', 'homeLocation'],
    TRUE
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    'Guard',
    'Guard schedule with day shift and patrol duties',
    '{
        "id": "template-guard",
        "name": "Guard",
        "slots": [
            {"id": "guard-morning-duty", "startTime": {"hour": 6, "minute": 0}, "endTime": {"hour": 12, "minute": 0}, "destination": {"type": "fixed", "locationId": "$guardPost"}, "activity": {"action": "guarding", "description": "Standing watch", "engagementLevel": "focused"}},
            {"id": "guard-lunch", "startTime": {"hour": 12, "minute": 0}, "endTime": {"hour": 13, "minute": 0}, "destination": {"type": "fixed", "locationId": "$barracks"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "guard-afternoon-duty", "startTime": {"hour": 13, "minute": 0}, "endTime": {"hour": 18, "minute": 0}, "destination": {"type": "fixed", "locationId": "$guardPost"}, "activity": {"action": "guarding", "description": "Standing watch", "engagementLevel": "focused"}},
            {"id": "guard-evening", "startTime": {"hour": 18, "minute": 0}, "endTime": {"hour": 22, "minute": 0}, "destination": {"type": "fixed", "locationId": "$barracks"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "guard-sleep", "startTime": {"hour": 22, "minute": 0}, "endTime": {"hour": 6, "minute": 0}, "destination": {"type": "fixed", "locationId": "$barracks"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$barracks"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}
    }',
    ARRAY['guardPost', 'barracks'],
    TRUE
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d481',
    'Tavern Keeper',
    'Tavern keeper with extended evening hours',
    '{
        "id": "template-tavern-keeper",
        "name": "Tavern Keeper",
        "slots": [
            {"id": "tavern-morning", "startTime": {"hour": 10, "minute": 0}, "endTime": {"hour": 14, "minute": 0}, "destination": {"type": "fixed", "locationId": "$tavern"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "tavern-break", "startTime": {"hour": 14, "minute": 0}, "endTime": {"hour": 16, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "tavern-evening", "startTime": {"hour": 16, "minute": 0}, "endTime": {"hour": 24, "minute": 0}, "destination": {"type": "fixed", "locationId": "$tavern"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "tavern-late", "startTime": {"hour": 0, "minute": 0}, "endTime": {"hour": 2, "minute": 0}, "destination": {"type": "fixed", "locationId": "$tavern"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "tavern-sleep", "startTime": {"hour": 2, "minute": 0}, "endTime": {"hour": 10, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$tavern"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}}
    }',
    ARRAY['tavern', 'homeLocation'],
    TRUE
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d482',
    'Noble',
    'Leisurely noble schedule with social engagements',
    '{
        "id": "template-noble",
        "name": "Noble",
        "slots": [
            {"id": "noble-wake", "startTime": {"hour": 9, "minute": 0}, "endTime": {"hour": 10, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "idle", "description": "Just waking up", "engagementLevel": "idle"}},
            {"id": "noble-breakfast", "startTime": {"hour": 10, "minute": 0}, "endTime": {"hour": 11, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "noble-study", "startTime": {"hour": 11, "minute": 0}, "endTime": {"hour": 13, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "studying", "description": "Reading or studying", "engagementLevel": "focused"}},
            {"id": "noble-lunch", "startTime": {"hour": 13, "minute": 0}, "endTime": {"hour": 14, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "noble-social", "startTime": {"hour": 15, "minute": 0}, "endTime": {"hour": 18, "minute": 0}, "destination": {"type": "fixed", "locationId": "$socialVenue"}, "activity": {"action": "socializing", "description": "Chatting with others", "engagementLevel": "casual"}},
            {"id": "noble-dinner", "startTime": {"hour": 19, "minute": 0}, "endTime": {"hour": 21, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "noble-evening", "startTime": {"hour": 21, "minute": 0}, "endTime": {"hour": 23, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "noble-sleep", "startTime": {"hour": 23, "minute": 0}, "endTime": {"hour": 9, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}
    }',
    ARRAY['manor', 'socialVenue'],
    TRUE
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d483',
    'Wanderer',
    'Traveler visiting various locations throughout the day',
    '{
        "id": "template-wanderer",
        "name": "Wanderer",
        "slots": [
            {"id": "wanderer-sleep", "startTime": {"hour": 22, "minute": 0}, "endTime": {"hour": 7, "minute": 0}, "destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}},
            {"id": "wanderer-morning", "startTime": {"hour": 7, "minute": 0}, "endTime": {"hour": 9, "minute": 0}, "destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "wanderer-market", "startTime": {"hour": 9, "minute": 0}, "endTime": {"hour": 14, "minute": 0}, "destination": {"type": "fixed", "locationId": "$market"}, "activity": {"action": "shopping", "description": "Browsing or buying", "engagementLevel": "casual"}},
            {"id": "wanderer-afternoon", "startTime": {"hour": 14, "minute": 0}, "endTime": {"hour": 18, "minute": 0}, "destination": {"type": "choice", "options": [{"weight": 7, "destination": {"type": "fixed", "locationId": "$market"}, "activity": {"action": "socializing", "description": "Chatting with others", "engagementLevel": "casual"}}, {"weight": 5, "destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}], "fallback": {"type": "fixed", "locationId": "$inn"}}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "wanderer-evening", "startTime": {"hour": 18, "minute": 0}, "endTime": {"hour": 22, "minute": 0}, "destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "drinking", "description": "Enjoying a drink", "engagementLevel": "casual"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}
    }',
    ARRAY['inn', 'market'],
    TRUE
)
ON CONFLICT DO NOTHING;
