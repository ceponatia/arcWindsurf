# Remaining Work Checklist for Happy Path Governance

## Canonical Governor Turn Workflow (Reference)

This section defines the expected end-state workflow so future changes stay aligned:

1. **API ingress & message persistence**
   1. Client calls `POST /sessions/:id/turns { input }`.
   2. API validates the session and body.
   3. API appends the user input to `messages` as a `user` role row, then reloads the session so `conversationHistory` includes this latest turn.
2. **Baseline & overrides recall**
   1. API loads character/setting/location instances for the session (the mutable per-session baseline).
   2. Governor/StateManager builds effective state for this turn as `baseline + overrides` (including any session/player/inventory slices), without writing to the DB yet.
3. **Intent detection & target resolution**
   1. Governor calls the configured intent detector (LLM or rule-based) with the player input and a thin context summary.
   2. Detector returns `DetectedIntent` with `type`, `confidence`, `params` (including optional `npcId` + `target`), and `signals`.
   3. A target-resolution layer post-processes this result, using recent conversation + active NPC state to infer `npcId` when omitted but strongly implied.
4. **Context retrieval**
   1. Governor asks the retrieval layer for knowledge nodes relevant to this turn (character/setting/location, and NPC-specific nodes keyed by `npcId`).
   2. DefaultContextBuilder assembles `TurnContext` with effective state, knowledgeContext, NPC transcripts from `npc_messages`, and recent session history.
5. **Agent routing & execution**
   1. Governor routes the intent to agents via AgentRegistry (MapAgent, NpcAgent per `npcId`, RulesAgent, etc.).
   2. Agents execute (parallel where safe), each returning an `AgentOutput` with:
      - `narrative` (what they "say" or describe), and
      - `statePatches` (JSON Patch operations against their slice) plus optional diagnostics/events.
   3. Agents never touch the DB directly; they only propose patches.
6. **Patch validation & state update**
   1. Governor gathers all proposed patches, applies schema/domain guardrails (immutable-field protection, basic rules like inventory consistency), and may optionally run heavier LLM-based consistency checks in dev mode.
   2. Accepted patches are applied via `StateManager.applyPatches` to produce the next baseline.
   3. Governor (or a thin DB adapter beneath it) persists the new baseline back into instance rows and records an audit entry (who proposed what for which turn).
7. **Response composition & persistence**
   1. Governor or a dedicated response composer LLM combines agent narratives and updated context into a single concise, in-world reply.
   2. API appends this reply to `messages` as an `assistant` role row.
   3. For each NPC agent that participated, API/Governor appends per-NPC transcript rows (player + NPC underlying reply) into `npc_messages` keyed by `(session_id, npc_id)`.
8. **Result & dev-mode metadata**
   1. Governor returns `TurnResult` with `message`, `events`, `stateChanges`, and `metadata` (intent debug, agent outputs, phase timing, etc. in dev mode).
   2. API returns this DTO to the client; dev UIs can render debug metadata, but raw LLM payloads remain in metadata/logs and are never written to `messages` or `npc_messages`.

## State & Persistence

- [ ] Mark when done

Wire Governor stateChanges into the DB layer in the turns route (apply patches via StateManager and persist overrides/profile state).
Decide and implement baseline/overrides modeling (Option A vs B) and update the turns route accordingly (use more than just name/summary; include location, inventory, time, etc. as schemas allow).
Persist governor-driven turns in the main messages table (user + governor-composed assistant messages) so session history survives refresh.
Design and implement per-NPC transcript storage (npc_messages table keyed by session_id + npc_id with speaker/content/index), plus DB helpers to append and read NPC conversations.
Decide how NPC identity is modeled in the DB (e.g., reference character_instance.id or a dedicated npcs table) so that NPC agents and retrieval both use the same canonical npc_id.
Treat character/setting/location instances as the mutable baseline for a session, with template snapshots used only as the initial state; compute effective state each turn as baseline + overrides via the StateManager.
Define an audit strategy for state changes (e.g., a state_change_log table) that records which agent types proposed which patches for which turn, to support debugging and tuning.
Ensure agents never write directly to the DB; instead they emit structured statePatches against their slice, and the Governor (or a thin DB adapter beneath it) is the sole component that validates and persists accepted patches back into instance rows.

## Retrieval

- [ ] Mark when done

On session creation / first turn, extract KnowledgeNode entries from effective character/setting (and later location) profiles and load them into InMemoryRetrievalService.
Ensure DefaultContextBuilder’s retrieval is actually returning non-empty knowledgeContext for realistic sessions.
Draft and document the pgvector-backed retrieval plan (schema + migration sketch), even if not yet implemented.
Add NPC-focused knowledge nodes (appearance, personality traits, clothing, relationships, etc.) keyed by npc_id so the governor can fetch character-specific context for NpcAgent without agents calling the DB directly.
Define retrieval filters for NPC dialogue turns (e.g., only pull knowledge nodes for the addressed npc_id and current location) and document how they are passed into AgentInput.knowledgeContext.

## Turn Flow & Agents

- [ ] Mark when done

Expand TurnStateContext baseline to include richer location, inventory, and time slices derived from DB instances (matching the “happy-path scenario” in the plan).
Add at least one “real” agent beyond fallback narrative (e.g., a simple Narrator or Navigation agent) and route intents to it via AgentRegistry.
Tune GovernorOptions (maxAgentsPerTurn, thresholds) against that scenario and document the chosen values.
Extend IntentParams in the governor / agents layer to include npcId (alongside target name) so talk intents can be routed to a specific NPC.
Introduce a target-resolution step after intent detection that can infer npcId from recent conversation history and activeNpc state when the player does not explicitly say the NPC’s name.
Implement an NpcAgentFactory and AgentRegistry support for per-npc NpcAgent instances (one per npcId), configured with npcId + displayName and using governor-supplied conversationHistory and knowledgeContext.
Update NpcAgent prompts and formatting so LLM replies are in-character, do not prefix with "Name:", and optionally strip any leading name labels the model adds.
After each turn, record per-npc conversation rows (player utterance + underlying NPC reply) to npc_messages for every NpcAgent that participated in the turn.
Standardize the per-turn flow: intent detection → context build (baseline + overrides) → parallel agent execution (narratives + proposed patches) → Governor validation and patch application → DB persistence → response composition → message persistence.
Design guardrails for agent-proposed patches (schema validation, immutable-field protections, simple domain rules), with the option to add a heavier LLM-based consistency checker in dev mode without blocking normal play.

## API & Tests

- [ ] Mark when done

Add end-to-end tests for POST /sessions/:id/turns that:
Seed a test DB session + instances.
Call the route and assert on TurnResult (message, metadata.intent, agents invoked, state changes).
Verify dev-mode metadata presence/absence when toggling GOVERNOR_DEV_MODE.
Add a governor-only harness or unit tests that call createGovernorForRequest directly (no HTTP) for quick validation of the turn pipeline.
Add tests to assert that POST /sessions/:id/turns persists user and assistant messages to the main messages table and that refreshing the session replays the same conversation.
Add tests that exercise NPC turns end-to-end (player talks to a named NPC, continues the conversation without re-naming them) and verify that npcId is inferred correctly and routed to the same NpcAgent.
Add unit tests around the target-resolution layer to validate history-based addressee inference (e.g., responses like "Thanks, that means a lot" after a specific NPC reply are resolved to that npcId).
Add integration tests that fetch per-npc transcripts from npc_messages and use them as conversationHistory for NpcAgent, ensuring agents see only their own conversation slice.

## Observability & Safety

- [ ] Mark when done

Replace direct console.log usage in Governor with a logging adapter supplied via GovernorConfig.logging, with environment-driven verbosity.
Define and enforce a logging policy (e.g., log sessionId + intent + counts, but not full profile JSON or raw LLM payloads in production).
Ensure error paths return safe, user-facing error messages while retaining detailed diagnostics in logs/metadata.
Ensure dev-mode intent detector and agent debug metadata (including raw LLM payloads) are exposed only via metadata/debug channels and never written into messages or npc_messages tables.
Add lightweight logs or traces for target resolution and NPC routing (e.g., which npcId was inferred and why) that are safe for production and help debug mis-routed conversations.

## Docs & Developer Experience

- [x] Mark when done

Update the dev docs listed in the integration plan (11, 12, 13, 09) to:
Describe the LLM intent detector, dev-mode metadata, turn route, and state flow.
Include a quickstart recipe for running a governor-driven turn from the web UI and via HTTP.
Double-check README and gov-plan/gov-integration-plan to mark which milestones are now satisfied and what’s still flagged as TBD.
Document the NPC agent lifecycle: how npcId is chosen, when NpcAgent instances are created (dev-mode preselection vs. future generative NPCs), and how per-npc transcripts and knowledge nodes feed into prompts.
Describe the separation between main session messages (UI-visible) and per-npc transcripts (agent-only), including what is and is not persisted for privacy/safety and debugging.
Update the governor integration plan with a section on target resolution and addressee inference, including examples of turns where npcId is inferred from context rather than explicit naming.
