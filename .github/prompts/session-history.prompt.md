# Session History Management

This prompt outlines the tasks required to refactor session (chat) history management. The current system is not fully documented so the first step involves reviewing the existing codebase to understand how chat histories are stored, managed, and passed to language models (LLMs).

## Implemented

- Added a `session_history` table (with owner/session IDs, turn index, context JSON, and debug JSON) so each turn is captured with timestamps and player input.
- Logged per-turn context from the API/governor, including state baselines/overrides, tags, and sanitized events/state changes for replay/debug.
- Captured agent prompts/responses (npc-agent and sensory-agent) in diagnostics so they flow into history debug entries alongside token usage and timing data.
