# Agent I/O Contracts

This document describes the intended input/output contracts between the Governor, specialized agents, the State Manager, and the surrounding API/runtime. It is grounded in the current codebase and up‑to‑date dev docs; anything not clearly implemented is called out or placed in the TBD section.

Relevant code and docs:

- Governor: [packages/governor/src/governor.ts](packages/governor/src/governor.ts)
- State Manager: [packages/state-manager/src/manager.ts](packages/state-manager/src/manager.ts) and [packages/state-manager/src/types.ts](packages/state-manager/src/types.ts)
- Governor overview: [dev-docs/11-governor-and-agents.md](dev-docs/11-governor-and-agents.md)
- State manager overview: [dev-docs/12-state-manager-and-embedding-lifecycle.md](dev-docs/12-state-manager-and-embedding-lifecycle.md)

---

## 1. High‑Level Flow

Conceptually, one player **turn** (a unit of time and state evaluation driven by freeform natural-language input) will eventually follow this path:

1. **API receives input**

- HTTP request from web/UI containing: `sessionId`, raw `playerInput` (freeform text), and any client metadata.
- API resolves/creates the backing DB session and loads the necessary state slices (character, setting, etc.).

1. **Governor orchestrates the turn**

- Governor is called with `sessionId` and `input` (see section 2).
- It performs intent detection, state recall, time update, agent routing, and aggregation.

1. **Agents perform domain‑specific reasoning**

- Each selected agent receives a normalized view of the player input plus the relevant effective state slice(s).
- Agents return narrative output and proposed state changes (including any time progression) in a structured format.

1. **State Manager applies changes**

- The Governor (or another orchestration layer) uses the State Manager to combine baseline state and per‑session overrides, apply JSON patches, and produce updated overrides.

1. **API persists and responds**

- Updated overrides are written back to the DB.
- The aggregated narrative result is returned to the client.

In addition to turn handling, there is a separate class of **profile normalization** flows that are not directly tied to a user chat turn but use the same building blocks:

- API receives a create/update request for a character profile that may include free-text fields such as `appearanceText`.
- A normalization/parsing job (potentially modeled as its own Governor intent) invokes regex and LLM-based parsers to produce structured attributes (for example, the `appearance` object and, later, other parsed-attribute maps).
- The State Manager is used to merge these parsed attributes into the existing profile JSON without requiring callers to send the full structured view.
- API persists the updated `profile_json` back to Postgres.

Several parts of this pipeline are implemented today:

- The Governor orchestrator in `@minimal-rpg/governor` implements a 7-step turn pipeline (intent detection, state recall, context retrieval, agent routing/execution, state update, response aggregation).
- `@minimal-rpg/state-manager` is used by the Governor for state recall and patch application.
- In production, the API’s `POST /sessions/:id/turns` route accepts freeform player text, builds a basic `TurnStateContext` from DB instances, calls `governor.handleTurn`, and returns a `TurnResultDto` over HTTP.

However, no domain agents are yet registered in the API’s Governor composition, and the API does not persist `TurnResult.stateChanges` back to Postgres. Time modeling and structured agent outputs are therefore still primarily design intent.

---

## 2. Governor Public Contract

The Governor is implemented in [packages/governor/src/governor.ts](packages/governor/src/governor.ts) and in practice is **instantiated via a composition factory in the API** (for example, `createGovernorForRequest`). The exact TypeScript signatures may evolve, but the public surface is conceptually:

- `GovernorConfig`
  - `stateManager: StateManager` — required for state recall and patch application.
  - `agentRegistry?: AgentRegistry` — optional registry of domain agents.
  - `retrievalService?: RetrievalService` — optional knowledge retrieval service.
  - `intentDetector?: IntentDetector` — LLM- or rule-based intent detector.
  - `options?: GovernorOptions` — includes `devMode`, thresholds, and limits.
  - `logging?: GovernorLoggingConfig` — controls logging behavior.
- `Governor.handleTurn(sessionId: string, input: string): Promise<TurnResult>`
- `Governor.handleTurn(turnInput: TurnInput): Promise<TurnResult>`
  - In the HTTP turns route, the API calls the `TurnInput` overload, passing `sessionId`, `playerInput`, a baseline `TurnStateContext`, empty `overrides`, and derived `conversationHistory`.

### 2.1 Inputs

The Governor supports two call shapes:

- `handleTurn(sessionId: string, input: string)` — convenience overload primarily useful for tests and simple callers.
- `handleTurn(turnInput: TurnInput)` — full contract used by the API, which includes:
  - `sessionId: string`
  - `playerInput: string`
  - `baseline: TurnStateContext` (character, setting, and eventually location, inventory, time)
  - `overrides: DeepPartial<TurnStateContext>` (currently `{}` in production)
  - `conversationHistory?: TurnConversationTurn[]`
  - Optional metadata such as `turnNumber`.

### 2.2 Outputs

`handleTurn` returns a `Promise<TurnResult>` with at least:

- `message: string`
  - Player‑facing narrative or status text for the turn.
  - When no agents are available or intent confidence is low, the Governor generates a deterministic narrative based on the detected intent (for example, movement/look/talk fallbacks).
- `events: TurnEvent[]`
  - Internal events emitted during processing (intent detected, agents run, state updated, etc.).
- `stateChanges?: TurnStateChanges`
  - Proposed JSON Patch-style changes to baseline/overrides, computed via the State Manager.
- `metadata?: TurnMetadata`
  - In dev mode, includes detected intent, intent-detection debug info, and per-agent outputs; in production mode, this is either omitted or reduced.

### 2.3 Governor Internal Use of State Manager

In the current implementation, the Governor **does** call the State Manager:

- **State recall**
  - `DefaultContextBuilder` calls `stateManager.getEffectiveState(baseline, overrides)` to compute an effective state used for intent context and (eventually) agent slices.

- **State update**
  - When agents (or fallback logic) produce patches, the Governor calls `stateManager.applyPatches(baseline, overrides, patches)` to compute `stateChanges`.

The concrete shapes of `baseline`, `overrides`, and `patches` are determined by the State Manager API (section 3) and agent contracts (section 4).

---

## 3. State Manager Contract

The State Manager is a small utility class defined in [packages/state-manager/src/manager.ts](packages/state-manager/src/manager.ts) with supporting types in [packages/state-manager/src/types.ts](packages/state-manager/src/types.ts).

### 3.1 Types

From [packages/state-manager/src/types.ts](packages/state-manager/src/types.ts):

```ts
export interface StateManagerConfig {
  // Future config
}

export interface StateMergeResult<T> {
  effective: T;
}

export interface StatePatchResult<T> {
  newOverrides: Partial<T>;
}
```

Key points:

- `StateMergeResult<T>` wraps a single `effective` field containing the merged state.
- `StatePatchResult<T>` wraps a single `newOverrides` field. For now, the implementation returns a full document as `newOverrides` rather than a minimal diff.

### 3.2 Class `StateManager`

```ts
export class StateManager {
  getEffectiveState<T>(baseline: T, overrides: Partial<T>): StateMergeResult<T>;

  applyPatches<T>(baseline: T, overrides: Partial<T>, patches: Operation[]): StatePatchResult<T>;
}
```

Where `Operation` comes from `fast-json-patch`.

#### 3.2.1 `getEffectiveState` inputs/outputs

Inputs:

- `baseline: T`
  - Immutable base document (for example, template snapshot or initial profile JSON).
  - Must be a plain JSON‑serializable object tree for the current helper to behave correctly.

- `overrides: Partial<T>`
  - Per‑session overrides over the baseline.
  - Can be an empty object if no overrides exist.

Output:

- `StateMergeResult<T>`
  - `effective: T` — merged view of `baseline` and `overrides` using a custom `deepMerge` helper.

Behavioral notes:

- Objects are merged recursively; primitive values in `overrides` replace `baseline` values.
- Arrays are treated as primitives (because `isObject` excludes arrays) and are replaced wholesale if present in `overrides`.
- The function does not perform schema validation or I/O.

#### 3.2.2 `applyPatches` inputs/outputs

Inputs:

- `baseline: T`
  - Same role as in `getEffectiveState`.

- `overrides: Partial<T>`
  - Existing overrides for the current entity/session.

- `patches: Operation[]`
  - JSON Patch operations as defined by `fast-json-patch`.
  - Expected to be applied conceptually to the **effective** state (baseline + overrides), not just the overrides layer.

Output:

- `StatePatchResult<T>`
  - `newOverrides: Partial<T>` — currently implemented as the entire patched effective state.

Processing steps (per implementation in [packages/state-manager/src/manager.ts](packages/state-manager/src/manager.ts)):

1. Call `getEffectiveState(baseline, overrides)` to compute `effective`.
2. Clone `effective` via `JSON.parse(JSON.stringify(effective))` into `nextState`.
3. Apply `patches` to `nextState` using `applyPatch(nextState, patches)`.
4. Return `{ newOverrides: nextState }`.

The comments in the implementation outline a more refined diff‑based design (deriving minimal overrides from `nextState` vs `baseline`), but that diff step is **not implemented yet**.

---

## 4. Conceptual Agent Contracts

Concrete agent types live in `@minimal-rpg/agents` (see [packages/agents/src/types.ts](packages/agents/src/types.ts)), and a `DefaultAgentRegistry` is implemented in [packages/agents/src/registry.ts](packages/agents/src/registry.ts). Example agents (map, NPC, rules, parser) exist but are **not** currently registered in the API’s Governor composition, so production turns run through the fallback narrative path only.

The conceptual pattern remains:

- Agents are domain‑specific workers (e.g., map/navigation, NPC/dialogue, rules/system).
- The Governor routes each turn to one or more agents based on intent and state via the `AgentRegistry`.
- Agents produce both narrative text and structured state changes.

The rest of this section describes the agent I/O contract in a way that matches the concrete `AgentInput`/`AgentOutput` types without depending on every field.

### 4.1 Conceptual Agent Input

Per‑turn, per‑agent inputs are expected to include:

- **Session and player context**
  - `sessionId: string`
  - `playerInput: string` — raw or lightly normalized text.
  - Potentially a structured `intent` object once intent detection is implemented.

- **Effective state slices**
  - A strongly typed slice of the effective state relevant to the agent, e.g.:
    - Character view (from character instance/profile).
    - Setting/location view.
    - Inventory and items.
  - These will be derived from `StateManager.getEffectiveState` results by higher layers.

- **Retrieved knowledge (future)**
  - Ranked knowledge nodes or contextual snippets derived from embeddings and retrieval.
  - Not present in any current code paths.

Parsing/normalization agents (for example, an "attribute parser" for appearance) have a narrower input/output surface:

- Inputs:
  - The current profile JSON (or a slice) including raw text fields such as `appearanceText`.
  - The target schema description for the parsed attributes (for example, the `Appearance` shape).
- Outputs:
  - A partial JSON object containing only the parsed attribute keys that could be inferred from the text (for example, `appearance.hair.color`, `appearance.hair.style`).
  - No requirement to fill every possible key; missing keys mean "no signal", not error.

### 4.2 Conceptual Agent Output

Each agent is expected to return a structure with at least:

- **Narrative output**
  - Player‑facing text describing what happens in this domain (e.g., dialogue line, movement description, rule outcome).

- **State change proposal**
  - A set of JSON Patch operations (`Operation[]`) or equivalent domain events that higher layers can convert into patches.
  - Patches are intended to be applied to the **effective** state, then converted into `newOverrides` via `StateManager.applyPatches`.

Additional fields (diagnostics, token usage, safety flags) may be added later but are not defined in code today.

### 4.3 Aggregation Responsibilities

Because multiple agents may be invoked for a single turn, the Governor will be responsible for:

- Combining multiple narrative outputs into a single `TurnResult.message`.
- Merging multiple sets of JSON Patch operations and resolving conflicts before calling `StateManager.applyPatches`.

Neither of these behaviors is implemented in the current Governor scaffold; they are design intent only.

---

## 5. JSON Patch Expectations

JSON Patch (RFC 6902) operations will be the primary way agents propose state changes.

### 5.1 Patch Target

The design comments in [packages/state-manager/src/manager.ts](packages/state-manager/src/manager.ts) imply:

- Agents reason over and generate patches **against the effective state** (baseline + overrides combined).
- `StateManager.applyPatches` currently applies patches to a cloned effective document.
- After patching, the entire patched document is treated as `newOverrides` in the return value.

This means that, until a proper diff step is added, callers should treat `newOverrides` as a **full replacement** for previously stored overrides (or, in the simplest integration, as the new per‑session document to persist).

### 5.2 Patch Shape and Validation

Current codebase status:

- There is no dedicated validation layer for agent‑generated patches.
- There is no enforcement that patches stay within a particular schema (e.g., `CharacterProfile`).
- There are no helper types for “safe patch subsets” or for whitelisting paths.

In practice, higher layers (Governor/API) will need to:

- Validate effective + patched state against Zod schemas from `@minimal-rpg/schemas` before persisting.
- Introduce guardrails around which paths agents are allowed to modify.

None of that validation logic exists yet; this is a contract requirement, not an implementation.

---

## 6. API / Governor / State Manager Integration (Planned)

Based on the current architecture docs and code, a future end‑to‑end flow would look like:

1. **API route** (in `packages/api`):
   - Accepts a turn request with `sessionId` and `playerInput`.
   - Loads baseline and overrides for character/setting instances from the DB.

2. **Governor invocation**:
   - Constructs or reuses a `Governor` instance wired with a `StateManager`.
   - Calls `handleTurn(sessionId, playerInput)`.

3. **Governor internals**:
   - Uses `StateManager.getEffectiveState` to compute effective views for required entities.
   - Runs intent detection and routes to appropriate agents.
   - Collects narrative outputs and JSON Patch proposals from agents.
   - Combines patches and calls `StateManager.applyPatches` to obtain `newOverrides`.

4. **Persistence**:
   - The API (or a dedicated service) writes `newOverrides` back to the DB as per‑session state.

5. **Response**:
   - The aggregated `TurnResult` from the Governor is turned into an HTTP response payload.

As of now, none of the API routes instantiate or call the Governor or State Manager; they continue to use ad‑hoc merge logic for overrides. This integration is a planned future step.

---

## 7. Safety and Observability Contracts

While not yet fully implemented, the following responsibilities are implied by current docs and scaffolds:

- The Governor should:
  - Log the `sessionId` and a summary of `input` for each turn.
  - Log which agents were invoked and high‑level state changes (counts or summaries, not raw JSON), once agents exist.
  - Handle failures from individual agents gracefully (fallback narrative, no inconsistent state commits).

- The State Manager should:
  - Remain a pure, in‑memory helper with no side effects, making it easy to test and reason about.
  - Eventually surface better diagnostics in `StateMergeResult` and `StatePatchResult` (for example, which paths changed), though this is not implemented today.

There are no tracing or metrics hooks in the current implementation.

---

## 8. Summary of What _Is_ Implemented

From the perspective of agent I/O, the current codebase guarantees only the following:

- `Governor.handleTurn(sessionId, input)` exists and returns a `TurnResult` with a single `message` string, but does not perform any real orchestration.
- `StateManager.getEffectiveState` and `StateManager.applyPatches` exist and behave as described in section 3 for arbitrary JSON‑serializable objects.
- There are no concrete agent classes, no agent interfaces, and no production integration between the API, Governor, and State Manager.

Everything else in this document is design intent based on the latest dev docs.

---

## 9. TBD / Open Questions

The following items are explicitly **not decided** or **not implemented** in the current codebase. They should be updated here once corresponding features land.

- **Agent interface definitions**
  - Exact TypeScript interfaces for agents (input/output shapes, error/timeout handling).
  - How multiple agents are composed (sequential vs. parallel execution, conflict resolution for patches).

- **Intent representation**
  - Whether intents are represented as a distinct type (e.g., discriminated unions) and how they are derived.
  - How intent feeds into agent routing.

- **Patch normalization and diffing**
  - Whether `StateManager.applyPatches` should compute minimal overrides vs. storing full documents.
  - How to handle very large documents or high‑frequency updates.

- **Schema validation layer**
  - Where Zod schemas from `@minimal-rpg/schemas` are applied in the flow (before agent call, after patch, both).
  - How validation failures are surfaced to the client and/or logged.

- **Retrieval/embedding integration**
  - Exact shape of knowledge nodes exposed to agents.
  - Where similarity search is called from (Governor vs. a separate retrieval service).
  - How retrieved context is represented in agent inputs and how agents can influence salience.

- **Session lifecycle semantics**
  - How sessions are created, resumed, and cleaned up from the Governor’s perspective.
  - How much historical turn context is passed to agents vs. reconstructed from state.

- **Observability contracts**
  - Standard log/metric/span structure for turns, agents, and patch application.
  - Policies for redacting sensitive data in logs.

If new agent types, state shapes, or cross‑package contracts are introduced, they should be reflected here with concrete TypeScript signatures once they are present in the codebase.
