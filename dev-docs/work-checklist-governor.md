# Remaining Work Checklist for Happy Path Governance

State & Persistence

Wire Governor stateChanges into the DB layer in the turns route (apply patches via StateManager and persist overrides/profile state).
Decide and implement baseline/overrides modeling (Option A vs B) and update the turns route accordingly (use more than just name/summary; include location, inventory, time, etc. as schemas allow).
Retrieval

On session creation / first turn, extract KnowledgeNode entries from effective character/setting (and later location) profiles and load them into InMemoryRetrievalService.
Ensure DefaultContextBuilder’s retrieval is actually returning non-empty knowledgeContext for realistic sessions.
Draft and document the pgvector-backed retrieval plan (schema + migration sketch), even if not yet implemented.
Turn Flow & Agents

Expand TurnStateContext baseline to include richer location, inventory, and time slices derived from DB instances (matching the “happy-path scenario” in the plan).
Add at least one “real” agent beyond fallback narrative (e.g., a simple Narrator or Navigation agent) and route intents to it via AgentRegistry.
Tune GovernorOptions (maxAgentsPerTurn, thresholds) against that scenario and document the chosen values.
API & Tests

Add end-to-end tests for POST /sessions/:id/turns that:
Seed a test DB session + instances.
Call the route and assert on TurnResult (message, metadata.intent, agents invoked, state changes).
Verify dev-mode metadata presence/absence when toggling GOVERNOR_DEV_MODE.
Add a governor-only harness or unit tests that call createGovernorForRequest directly (no HTTP) for quick validation of the turn pipeline.
Observability & Safety

Replace direct console.log usage in Governor with a logging adapter supplied via GovernorConfig.logging, with environment-driven verbosity.
Define and enforce a logging policy (e.g., log sessionId + intent + counts, but not full profile JSON or raw LLM payloads in production).
Ensure error paths return safe, user-facing error messages while retaining detailed diagnostics in logs/metadata.
Docs & Developer Experience

Update the dev docs listed in the integration plan (11, 12, 13, 09) to:
Describe the LLM intent detector, dev-mode metadata, turn route, and state flow.
Include a quickstart recipe for running a governor-driven turn from the web UI and via HTTP.
Double-check README and gov-plan/gov-integration-plan to mark which milestones are now satisfied and what’s still flagged as TBD.
