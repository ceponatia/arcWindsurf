-- Tool call history for preserving tool usage context across turns
-- This helps the LLM maintain tool calling patterns in long conversations

CREATE TABLE IF NOT EXISTS tool_call_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  turn_idx INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  tool_args JSONB NOT NULL,
  tool_result JSONB,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for retrieving recent tool calls by session
CREATE INDEX IF NOT EXISTS idx_tool_call_history_session_turn 
  ON tool_call_history(session_id, turn_idx DESC);

-- Index for analyzing which tools are used most
CREATE INDEX IF NOT EXISTS idx_tool_call_history_tool_name 
  ON tool_call_history(tool_name);

-- Conversation summary storage for long sessions
-- Stores LLM-generated or structured summaries including tool usage patterns
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'tool_usage', 'npc_specific'
  npc_id TEXT, -- NULL for general summaries
  summary_text TEXT NOT NULL,
  covers_up_to_turn INTEGER NOT NULL,
  tool_usage_hints TEXT[], -- e.g., ['npc_dialogue for Taylor interactions', 'get_sensory_detail for smell/touch']
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for session/type/npc combination (handles NULL npc_id correctly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_summaries_unique 
  ON conversation_summaries(session_id, summary_type, COALESCE(npc_id, ''));

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_session 
  ON conversation_summaries(session_id);
