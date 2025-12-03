# Governor & Agent System Integration Plan

This document outlines a staged plan to implement and integrate the
`@minimal-rpg/governor`, `@minimal-rpg/agents`, `@minimal-rpg/state-manager`,
and `@minimal-rpg/retrieval` packages into the runtime with full
functionality for a first pass. Any components that cannot be implemented
right now are explicitly marked as TBD.

## Blocking Work

- [x] Must finish schemas for locations and inventory (DONE)

## 1. Define and Implement Minimal End-to-End Turn Flow

- Choose a concrete happy-path scenario (e.g. move + look in a small
  connected map with at least one NPC and one usable item).
- Confirm and document the required state domains for this slice:
  - character: `name`, `summary`, `goals`, `personalityTraits`.
  - setting: `name`, `summary`, `themes`.
  - location: `id`, `name`, `description`, `exits`.
  - inventory: `items` with `id`, `name`, `description`, `usable`.
- Document how these fields map onto the existing `TurnStateContext` and
  `AgentStateSlices` shapes (types already cover these domains) and call out
  any missing data sources that need to be filled in.
- Implement the full request path for this scenario:
  - Persist session and instance rows in the test DB via the existing DB
    package.
  - Create an API route that receives input and returns a `TurnResult`.
  - Run Governor, AgentRegistry, StateManager, and Retrieval (in-memory) in
    the same request; validate behaviors for the scenario.

**Deliverables:**

- A short dev note or README update describing the chosen turn scenario and
  required fields.
- A working happy-path turn accessible via HTTP that exercises the flow.

## 2. Wire Governor into API Session Route (Full Path)

- Add or extend an API entrypoint for turn handling, such as
  `POST /sessions/:id/turns` (or extend `POST /sessions/:id/messages`).

In the request handler, implement the full flow:

- Load the DB session and associated character/setting instances.
- Build `baseline` and `overrides` objects for `TurnStateContext` from the
  stored `template_snapshot` and `profile_json` columns.
- Construct a `TurnInput` (`sessionId`, `playerInput`, `baseline`,
  `overrides`, `conversationHistory`).
- Inject a concrete `Governor` instance resolved from the API composition
  factory and call `handleTurn`.
- Persist updated overrides/state back to Postgres using the DB layer.
- Translate `TurnResult` into the HTTP response payload; return `message`,
  `events`, `stateChanges`, and metadata.

**Deliverables:**

- A production-ready API route that calls the Governor and persists state
  changes.
- A clear mapping from DB/session data to `TurnInput` and back.

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

- Finish the location and inventory schemas so the state manager can validate every slice before persistence.
- Sketch the Governor composition factory (StateManager + AgentRegistry + Retrieval + IntentDetector) and expose it to the API layer.
- Replace the existing POST /sessions/:id/messages logic with the Governor-backed turn route, persisting the returned patches via StateManager.applyPatches and seeding retrieval nodes on session bootstrap.
