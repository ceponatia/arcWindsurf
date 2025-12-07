# Governor & Agent System Integration Plan

This document outlines a staged plan to implement and integrate the
`@minimal-rpg/governor`, `@minimal-rpg/agents`, `@minimal-rpg/state-manager`,
and `@minimal-rpg/retrieval` packages into the runtime with full
functionality for a first pass. Any components that cannot be implemented
right now are explicitly marked as TBD.

## Blocking Work

- [x] Must finish schemas for locations and inventory (DONE)

## 1. Define and Implement Minimal End-to-End Turn Flow

- Choose a concrete happy-path scenario that can be expressed in **natural
  language chat** while still exercising core game actions. For example:
  moving and looking around a small connected map with at least one NPC and
  one usable item, where the user can speak casually ("I head north toward
  the cafe", "I look around", "I ask Taylor about the concert").
- Confirm and document the required state domains for this slice:
  - character: `name`, `summary`, `goals`, `personalityTraits`.
  - setting: `name`, `summary`, `themes`.
  - location: `id`, `name`, `description`, `exits`.
  - inventory: `items` with `id`, `name`, `description`, `usable`.
  - time: `currentTime`, and a **turn time policy** that controls how much
    in-world time advances per turn.
- Document how these fields map onto the existing `TurnStateContext` and
  `AgentStateSlices` shapes (types already cover these domains) and call out
  any missing data sources that need to be filled in.
- Treat a **turn** as a unit of timeline advancement and state evaluation,
  not as a narrow command interface:
  - Each turn accepts **freeform player text**.
  - Intents (move, look, talk, wait/advance-time, etc.) are parsed from that
    text (eventually by a `ParserAgent`), but the full text remains available
    to the LLM for narrative.
  - The governor advances in-world time according to a configurable policy
    (see below), then orchestrates agents and state changes.
- Implement the full request path for this scenario:
  - Persist session and instance rows in the test DB via the existing DB
    package (already implemented and in use by the API).
  - Create an API route that receives input and returns a `TurnResult`.
    **Status:** a minimal version exists today at `POST /sessions/:id/turns`
    and is wired to the Governor, backed by DB instances rather than static
    files. If we decide to _abandon_ or substantially change this route
    shape, we should make a note to **revert or update the current
    implementation in `packages/api/src/routes/turns.ts` accordingly.**
  - Run Governor, AgentRegistry, StateManager, and Retrieval (in-memory) in
    the same request; validate behaviors for the scenario. **Status:** a
    Governor-driven flow exists today: LLM-based intent detection and
    fallback narratives are implemented, and the in-memory retrieval
    service is wired but not yet populated; map/NPC/rules agents and
    persistent retrieval data remain TODO.

**Deliverables:**

- A short dev note or README update describing the chosen turn scenario and
  required fields.
- A working happy-path turn accessible via HTTP that exercises the flow.

## 2. Wire Governor into API Session Route (Full Path)

- Add or extend an API entrypoint for turn handling, such as
  `POST /sessions/:id/turns` (or extend `POST /sessions/:id/messages`).
  **Status:** `POST /sessions/:id/turns` is currently implemented and
  reachable from the web UI behind a feature flag
  (`VITE_USE_TURNS_API=true`). It loads the session and its
  character/setting instances from Postgres and calls the Governor with a
  minimal `TurnStateContext` baseline. If we later decide to consolidate
  back into `POST /sessions/:id/messages` or change the route contract, we
  should **revisit and possibly revert/update this handler**.

In the request handler, implement the full flow:

- Load the DB session and associated character/setting instances.
- Build `baseline` and `overrides` objects for `TurnStateContext` from the
  stored `template_snapshot` and `profile_json` columns (currently we only
  derive a minimal baseline; overrides and full state application via
  `StateManager` are still TODO).
- Construct a `TurnInput` (`sessionId`, `playerInput`, `baseline`,
  `overrides`, `conversationHistory`).
- Inject a concrete `Governor` instance resolved from the API composition
  factory and call `handleTurn`.
- Persist updated overrides/state back to Postgres using the DB layer,
  using `StateManager.applyPatches` once agents emit structured state
  changes.
- Translate `TurnResult` into the HTTP response payload; return `message`,
  `events`, `stateChanges`, and metadata.

**Deliverables:**

- A production-ready API route that calls the Governor and persists state
  changes (evolution of the existing `/sessions/:id/turns` handler).
- A clear mapping from DB/session data to `TurnInput` and back, including
  how time (turn progression) is represented in session state.

## 3. Instantiate Governor and Dependencies (Concrete Composition)

- Create a composition module (or factory) in `@minimal-rpg/api` to construct
  the `Governor` with concrete dependencies:
  - `StateManager` configured with sensible defaults such as
    `validateOnMerge` and `computeMinimalDiff` for test/dev runs.
  - `AgentRegistry` registered with `MapAgent`, `NpcAgent`, `RulesAgent`, and
    `ParserAgent`.
  - `RetrievalService` implementation: use `InMemoryRetrievalService` for now
    and mark DB-backed vector store (pgvector) as **TBD**.
  - `IntentDetector`: start with `createFallbackIntentDetector()` and
    provide an override for future models.
  - `GovernorOptions` tuned conservatively (small `maxAgentsPerTurn`,
    `continueOnAgentError: true`, `applyPatchesOnPartialFailure: false`).

**Deliverables:**

- A factory function (for example `createGovernorForRequest`) that constructs
  a fully-configured `Governor` instance.
- Unit tests/harness that instantiate the `Governor` outside the HTTP layer
  for quick developer feedback.

## 4. Adopt `StateManager` for Session State (Replace Ad-Hoc Merging)

- Replace the API layer’s ad-hoc deep-merge logic with `StateManager` calls:
  use `getEffectiveState` for reads and `applyPatches` for commits.
- Choose an initial baseline/overrides modeling approach and document it:
  - Option A (current implementation): treat `template_snapshot` as the
    immutable baseline and continue storing the full effective document in
    `profile_json`, deriving overrides in memory when needed for
    `StateManager` calls.
  - Option B (compact diffs / future): shift to persisting minimal overrides
    separately (new column or JSONB structure) and keep `profile_json` as a
    derived view — **TBD** until DB schema and migration are defined.

- Validate effective state changes against Zod schemas from
  `@minimal-rpg/schemas` before persisting.

**Deliverables:**

- API paths that now use `StateManager` helpers instead of custom merging.
- Updated documentation describing baseline/overrides choice and trade-offs.

## 5. Retrieval Hook (In-Memory Now, DB-Backed TBD)

- Integrate retrieval for the first pass using `InMemoryRetrievalService`:
  - On session creation or first turn, extract `KnowledgeNode` entries from
    effective character/setting profiles and store them in the in-memory
    store.
  - Wire this service into the Governor’s context builder so that
    `knowledgeContext` is populated for agents.
  - Supply retrieved nodes in a concise, controlled context block for
    agents.

- Create a plan for a Postgres-backed retrieval service (pgvector) and mark
  schema/migration details as **TBD**.

**Deliverables:**

- A working in-memory retrieval instance wired into the Governor.
- A short developer doc describing the Postgres-backed retrieval plan and
  limitations of the in-memory approach.

## 6. End-to-End Tests and Harness

- Add tests that exercise the end-to-end flow:
  - A focused test that seeds a test DB session, constructs a `Governor`, and
    executes example commands (e.g., "look", "go north"), asserting on
    `TurnResult`, agent invocations, and state changes.
  - An API-level integration test that calls the HTTP route and validates
    the response and persisted state.

**Deliverables:**

- Test suites that confirm the end-to-end governor-driven turn for a chosen
  scenario using the test DB and HTTP layer.

## 7. Observability and Safety Pass

- Replace `console.log` usage with a configurable logging adapter supplied by
  the API (so verbosity and redaction can be managed per environment).
- Decide a safe logging policy for turns (sessionId, intent, agents invoked,
  counts of state changes) and avoid logging full profile JSON in cleartext.
- Ensure agent and state-manager errors result in safe, user-facing error
  messages while preserving diagnostic detail in logs and metadata.

**Deliverables:**

- Logging configuration for the Governor and updated dev docs on error
  handling and log formats.

## 8. Documentation Updates

- Update the following docs and the README with the integrated design and a
  quickstart for developers:
  - `dev-docs/11-governor-and-agents.md`
  - `dev-docs/12-state-manager-and-embedding-lifecycle.md`
  - `dev-docs/13-agent-io-contracts.md`
  - `dev-docs/09-retrieval-and-scoring.md` (if retrieval is enabled)

**Deliverables:**

- Updated dev docs reflecting integration choices, limitations, and a
  quickstart to run a governor-driven turn.

## Notes and TBD

- Postgres-backed retrieval and embedding lifecycle (pgvector) is a future
  enhancement and is **TBD** for this initial integration.
- Storing minimal overrides (Option B) is **TBD** until a DB schema and
  migration strategy are determined.

## Next Steps

- Revert any unwanted changes from the erroneous initial implementation of the turn system.
- Potentially grab additional API keys for DeepSeek (or other agents) to fully activate the governor & agents.
