-- Cleanup legacy tool-call observability tables no longer used by the governor
-- Drops tool_call_history and conversation_summaries

DROP TABLE IF EXISTS tool_call_history CASCADE;
DROP TABLE IF EXISTS conversation_summaries CASCADE;
