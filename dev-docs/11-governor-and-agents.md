# Governor and Agents

Steps:

- Ensure OpenRouter is configured (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`) so the LLM intent detector can run.
- Optionally enable dev mode on the API to surface richer metadata:
  - Set `GOVERNOR_DEV_MODE=true` in `packages/api/.env`.
- Call the turns endpoint with freeform input:

```bash
curl -X POST \
  "http://localhost:3001/sessions/<SESSION_ID>/turns" \
  -H "Content-Type: application/json" \
  -d '{"input":"I look around"}'
```

The response is a JSON-serialized `TurnResultDto` with at least:

- `message: string` – the narrative for this turn.
- `events: TurnEvent[]` – turn/agent/state events.
- `stateChanges?: TurnStateChanges` – summary of applied patches (usually `null`/`undefined` until agents emit patches).
- `metadata?: TurnMetadata` – in dev mode, includes `intent`, `intentDebug`, `agentsInvoked`, `agentOutputs`, and `phaseTiming`.
- `metadata?: TurnMetadata` – observability data, including detected intent, debug artefacts, phase timings, and agent outputs when dev mode is enabled.

In the **API layer**, a concrete composition factory `createGovernorForRequest` exists in [packages/api/src/governor/composition.ts](packages/api/src/governor/composition.ts) and is used by the `POST /sessions/:id/turns` route. That route:

- Treats each HTTP call as a **turn** over a DB-backed session.
- Builds a minimal `TurnStateContext` (character + setting, with room to grow into location, inventory, and time slices).
- Calls `governor.handleTurn` with `TurnInput` (sessionId, playerInput, baseline, overrides, and a short `conversationHistory`).

The current Governor behavior supports LLM-based intent detection, optional agent routing, and a deterministic fallback narrative. If no agents are registered in the `AgentRegistry` (the current default), the Governor generates a simple branch based on the detected intent type (for example, move/look/talk/wait) instead of invoking domain-specific agents.

## 2. High-level Turn Flow (Natural Language + Time)

The intended per-turn flow for the Governor is **natural-language-first** and **time-aware**. A turn is not a special syntax like `go north`; it is a point where the system:

1. Receives freeform player text.
2. Advances in-world time according to a configurable **turn time policy**.
3. Evaluates state, runs agents, and produces a narrative + events.

Concretely, the per-turn flow is:

1. Intent detection

- Analyze the raw player input and recent context to determine what the player is trying to do (for example, move, talk, inspect, use item, wait/advance-time, meta-questions).
- In the current implementation, this is handled by an `IntentDetector` implementation. In production, `LlmIntentDetector` uses OpenRouter + DeepSeek to classify the turn into a `DetectedIntent` (type, confidence, params, signals) and produces detailed debug artefacts when dev mode is enabled.
- Player utterances like "I head north toward the cafe" or "I look around" are **not** special commands; they are just natural language that the detector interprets into structured intents.

1. State recall

- Use StateManager to fetch the relevant effective state for the current session.
- The effective state is built using the template + snapshot instance pattern documented in the state/persistence docs (templates are immutable; instances carry per-session overrides).
- The Governor does not perform merging logic directly; it relies on the StateManager interface for that.

1. Time update

- Consult the session’s **turn time policy** (for example, fixed duration per turn, intent-dependent advancement, explicit "wait" actions) to determine how much `currentTime` should advance.
- Apply this time delta as part of the state changes for the turn.
- This time domain is conceptually part of the state model; actual fields and persistence wiring are still TODO.

1. Agent routing and execution

- Based on the detected intent(s), choose one or more specialized agents (for example, NPC/dialogue agent, map/navigation agent, rules/system agent).
- Provide each agent with the effective state slice and the player input (both the parsed intent and the original text for narrative grounding).
- Collect agent responses, including any proposed state changes.
- In the current code, a pluggable `AgentRegistry` exists (`DefaultAgentRegistry` in `@minimal-rpg/agents`), but `createDefaultRegistry()` registers no agents by default. As a result, the runtime path typically routes to **zero** agents and falls back to the built‑in intent-based narrative generator.

1. State update

- Take structured state change proposals from agents (including time progression) and pass them to StateManager for application.
- The Governor does not write to the database directly; it delegates that responsibility to the API/DB layer.

1. Response aggregation

- Combine the agent narratives and system messages into a single `TurnResult`.
- The current implementation emits a generic fallback message; richer aggregation is planned.

In addition to turns initiated by player input, the Governor (or a closely related orchestration layer) is a natural place to trigger **in-session profile normalization/parsing** jobs when character attributes change during the course of a game session (for example, state updates emitted by agents). Those flows are defined as separate intents (for example, "normalizeCharacterProfileForSession") that:

- Load the latest per-session profile JSON (including any mutated fields).
- Invoke regex and LLM-based parsers to refresh parsed attributes (for example, `appearance` fields) when in-session text fields change.
- Commit the resulting JSON back to persistence via the State Manager and DB APIs.

By contrast, when characters are initially **created or updated** in the builder UI, parsing is initiated directly from the character builder page and is **not turn-based**. The turn system only comes into play once a session is running and the player is sending freeform chat to advance time and state.

## 3. Governor Configuration and Dependencies

The Governor is instantiated with a `GovernorConfig` object. In production, `createGovernorForRequest` wires this up as follows (see [packages/api/src/governor/composition.ts](packages/api/src/governor/composition.ts)):

- `stateManager: StateManager` – a singleton created from `@minimal-rpg/state-manager` with `validateOnMerge` and `computeMinimalDiff` enabled.
- `agentRegistry?: AgentRegistry` – currently a `DefaultAgentRegistry` instance from `@minimal-rpg/agents`, which starts empty unless agents are manually registered.
- `retrievalService?: RetrievalService` – an `InMemoryRetrievalService` from `@minimal-rpg/retrieval`, used by the Governor’s `DefaultContextBuilder` to populate `knowledgeContext` when nodes are available.
- `intentDetector?: IntentDetector` – resolved once per process:
  - If `OPENROUTER_API_KEY` is set, a process-wide `LlmIntentDetector` is created that calls OpenRouter/DeepSeek.
  - Otherwise, a rule-based fallback detector from `createRuleBasedIntentDetector()` is used.
- `options?: GovernorOptions` – merged with defaults and including:
  - `maxAgentsPerTurn`, `continueOnAgentError`, `applyPatchesOnPartialFailure`, `intentConfidenceThreshold`.
  - `devMode` derived from `GOVERNOR_DEV_MODE` (see API config below).
- `logging?: GovernorConfig['logging']` – optional logging hooks for turns, intent detection, retrieval, agents, and state changes.

Key points about this configuration:

- The Governor does not construct or own the StateManager; it receives a ready-to-use instance.
- This keeps orchestration logic separate from persistence, making it easier to test the Governor in isolation by swapping in a mock StateManager.
- LLM configuration is isolated to the API’s OpenRouter adapter; the Governor only sees an abstract `IntentDetector`.
- Retrieval and agents are optional: if either is omitted, the Governor still produces a coherent intent-based fallback narrative.

## 4. Interaction with the State Manager

The State Manager lives in the @minimal-rpg/state-manager package and encapsulates all logic for managing baseline templates, per-session overrides, and effective state computation.

Conceptually, the responsibilities are:

- StateManager
  - Provides an API to load effective state for a given session/entity.
  - Accepts patches or structured updates and persists them as per-session overrides.
  - Owns any knowledge about database schema, JSON shapes, and template/instance separation.

The Governor only interacts with StateManager via its public interface (for example, calls like getEffectiveState and applyPatches in the scaffolded comments). The exact method names and signatures are defined in the state-manager package; this document avoids duplicating them in case they evolve.

Important design constraints:

- The Governor must treat StateManager as the single source of truth for state.
- All mutations go through StateManager; the Governor should never bypass it and touch DB clients directly.
- StateManager is responsible for reconciling immutable templates with mutable per-session overrides, and for any JSON patch application.

## 5. Specialized Agents (Conceptual)

The Governor is designed to orchestrate one or more specialized agents, but these agents are not yet implemented as concrete classes in the codebase. Instead, the design is informed by earlier architecture docs and the high-level responsibilities already referenced in packages/governor/README.md.

The main agent types we plan to support are:

- Map / Navigation Agent
  - Interprets movement and exploration intents.
  - Decides which location the player moves to and what they perceive there.

- NPC / Dialogue Agent
  - Handles conversation with characters.
  - Uses character and relationship state to shape responses.

- Rules / System Agent
  - Applies core game rules (success/failure checks, resource updates, consequences).

Each agent is expected to:

- Receive:
  - A slice of effective state relevant to its domain (e.g., current location, nearby entities, character profile).
  - The normalized player intent and raw input.
  - Optional retrieved knowledge/context (see Section 6).
- Return:
  - Narrative output (what the player sees or hears).
  - Structured state changes (e.g., JSON patches or higher-level operations) that can be fed into StateManager.

The exact TypeScript interfaces for these agents are still evolving and are not yet part of the codebase.

## 6. Context Retrieval and Embeddings (Future)

Earlier design documents describe a knowledge-node and vector-based retrieval system where character and setting profiles are decomposed into nodes, embedded, and retrieved via pgvector. The current implementation splits this into two layers:

- **In-memory retrieval (implemented):**
  - `createGovernorForRequest` instantiates an `InMemoryRetrievalService` and passes it into the Governor.
  - `DefaultContextBuilder` (see [packages/governor/src/context-builder.ts](packages/governor/src/context-builder.ts)) calls `retrievalService.retrieve(...)` to build a `knowledgeContext` array for each turn when nodes are present.
  - As of now, no production code populates this service with `KnowledgeNode` entries, so `knowledgeContext` is typically empty even though the plumbing and types are in place.

- **DB-backed retrieval (planned):**
  - Character and setting profiles will eventually be decomposed into nodes, embedded, and stored in Postgres with pgvector.
  - The retrieval service will query this store, score results, and surface a compact context block per turn.
  - Agents will consume these retrieved/salient details instead of entire raw JSON profiles, and may adjust importance scores in response to narrative events (for example, marking an item as highly salient).

Because the DB-backed retrieval layer is still in flux, details like table names, embedding models, and scoring formulas are intentionally omitted here and should be referenced from the dedicated knowledge-node and retrieval docs instead.

In the meantime, the in-memory service provides a convenient seam for experimentation and for unit tests that want to validate how agents behave when `knowledgeContext` is populated.

## 7. Error Handling and Observability

Planned responsibilities for the Governor around robustness include:

- Logging each turn with:
  - sessionId
  - player input summary
  - chosen intent and routed agents
  - high-level state changes (counts, not full diffs)

- Handling partial failures:
  - If an agent fails, the Governor should surface a safe fallback message and avoid committing partial or inconsistent state.

- Integrating with tracing/metrics (TBD) so that downstream issues in agents or the state layer can be inspected.

The current scaffold only logs a single console line when handleTurn is called; richer observability will be added as the orchestration logic is implemented.

## 8. Open Questions and TBDs

The following aspects are intentionally left as TBD because they are not yet implemented or are still being designed:

- Exact intent detection mechanism
  - Whether this is a dedicated LLM call, a rule-based classifier, or a hybrid.
  - How intent schemas are defined and versioned.

- Agent interface definitions
  - Concrete TypeScript interfaces for agents, including error/timeout contracts.
  - How multiple agents are composed (sequential vs. parallel, priority rules).

- State update format
  - Whether agents emit RFC 6902 JSON Patch operations, higher-level domain events, or both.
  - How conflicting updates from multiple agents in a single turn are resolved.

- Retrieval and embedding pipeline
  - Exact shape of knowledge nodes and how they relate to state-manager types.
  - Where embedding generation and refresh live (Governor vs. background jobs).
  - How salience/importance is tracked over time.

- Session lifecycle
  - How sessions are created, resumed, and terminated from the Governor’s point of view.
  - How much historical context (previous turns) the Governor keeps in memory vs. re-derives from state.

These items should be updated once corresponding implementations land in the codebase.

## 9. Quickstart: Governor-Driven Turn

This section describes how to run a Governor-backed turn both via HTTP and from the web UI.

### 9.1 Via HTTP

Prerequisites:

- API server running locally (`pnpm -F @minimal-rpg/api dev` or `pnpm core`).
- A session created via `POST /sessions` (the response includes `id`).

Steps:

1. Ensure OpenRouter is configured (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`) so the LLM intent detector can run.
2. Optionally enable dev mode on the API to surface richer metadata:
   - Set `GOVERNOR_DEV_MODE=true` in `packages/api/.env`.
3. Call the turns endpoint with freeform input:

   ```bash
   curl -X POST \
     "http://localhost:3001/sessions/<SESSION_ID>/turns" \
     -H "Content-Type: application/json" \
     -d '{"input":"I look around"}'
   ```

4. The response is a JSON-serialized `TurnResultDto` with at least:

- `message: string` – the narrative for this turn.
- `events: TurnEvent[]` – turn/agent/state events.
- `stateChanges?: TurnStateChanges` – summary of applied patches (usually `null`/`undefined` until agents emit patches).
- `metadata?: TurnMetadata` – in dev mode, includes `intent`, `intentDebug`, `agentsInvoked`, `agentOutputs`, and `phaseTiming`.

### 9.2 From the Web UI

Prerequisites:

- API and Web dev servers running (see root `README.md` quick start).
- At least one character and setting available so you can create a session.

Steps:

- In the web env (`packages/web/.env` or your shell), set:
  - `VITE_USE_TURNS_API=true` – routes chat through `POST /sessions/:id/turns` instead of the legacy messages endpoint.
  - Optionally `VITE_GOVERNOR_DEV_MODE=true` – enables the debug bubbles panel when the backend dev flag is also on.
- In the API env, set `GOVERNOR_DEV_MODE=true` if you want rich metadata and UI debug bubbles.
- Start the stack:
  - `pnpm -F @minimal-rpg/api dev`
  - `pnpm -F @minimal-rpg/web dev`
- In the browser, create or select a session and send a message such as "I look around".
- When both dev flags and `VITE_USE_TURNS_API` are enabled, each assistant turn shows:
  - The main narrative from the Governor.
  - A stack of debug bubbles under the message (intent summary, prompt snapshot, raw detector payload, agent outputs) driven by `TurnMetadata`.

Disable either dev flag (and reload) to return to the standard chat experience with no additional metadata or debug UI.
