-- Persona profiles (player character templates)
-- These are user-created persona definitions that can be reused across sessions

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  user_id TEXT,  -- optional owner (for multi-user support in the future)
  profile_json JSONB NOT NULL,  -- PersonaProfile data from @minimal-rpg/schemas
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_created_at ON personas(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_personas_updated_at ON personas;
CREATE TRIGGER trigger_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW
  EXECUTE FUNCTION update_personas_updated_at();

-- Session personas (per-session persona instances)
-- Snapshot of persona at session start with session-specific overrides

CREATE TABLE IF NOT EXISTS session_personas (
  session_id TEXT PRIMARY KEY REFERENCES user_sessions(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,  -- reference to personas table (or inline for one-off personas)
  profile_json JSONB NOT NULL,  -- snapshot of PersonaProfile at session start
  overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb,  -- session-specific modifications
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_personas_persona_id ON session_personas(persona_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_session_personas_updated_at ON session_personas;
CREATE TRIGGER trigger_session_personas_updated_at
  BEFORE UPDATE ON session_personas
  FOR EACH ROW
  EXECUTE FUNCTION update_session_personas_updated_at();

-- Add comment documentation
COMMENT ON TABLE personas IS 'Player character templates that can be reused across sessions';
COMMENT ON COLUMN personas.profile_json IS 'PersonaProfile schema: id, name, age, gender, summary, appearance?, body?';
COMMENT ON COLUMN personas.user_id IS 'Optional user ownership for multi-user support';

COMMENT ON TABLE session_personas IS 'Active persona instance for a session with session-specific state';
COMMENT ON COLUMN session_personas.profile_json IS 'Snapshot of persona at session start';
COMMENT ON COLUMN session_personas.overrides_json IS 'Session-specific modifications (appearance changes, equipment, etc.)';
