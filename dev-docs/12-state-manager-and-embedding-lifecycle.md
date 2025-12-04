# State Manager and Embedding Lifecycle

This document describes the **current** `@minimal-rpg/state-manager` package, how it is intended to be used by the Governor and API, and what is (and is not) implemented today around embeddings and knowledge nodes.

Anything not clearly supported by the codebase is called out explicitly or moved to the TBD section.

---

## 1. Purpose and Scope

The State Manager is a small utility layer that:

- Computes **effective state** by merging a baseline document (for example, a template snapshot) with per-session overrides.
- Applies **JSON Patch (RFC 6902)** operations to derive new overrides from a baseline + existing overrides.

It currently lives entirely in TypeScript in
[packages/state-manager/src/manager.ts](packages/state-manager/src/manager.ts) and does **not** talk to the database, LLMs, or the HTTP API directly. It is a pure in-memory helper; higher layers are responsible for loading/storing state and for integrating it into the request/response loop.

The State Manager is designed to support but is not yet fully wired into:

- The **natural-language, time-based Governor turn loop** (see [dev-docs/11-governor-and-agents.md](dev-docs/11-governor-and-agents.md)), where each HTTP turn is freeform player text plus a unit of in-world time advancement.
- A future knowledge-node + embedding pipeline (see [dev-docs/08-knowledge-node-model.md](dev-docs/08-knowledge-node-model.md) and [dev-docs/09-retrieval-and-scoring.md](dev-docs/09-retrieval-and-scoring.md)).

---

## 2. Current StateManager API

The concrete implementation is in
[packages/state-manager/src/manager.ts](packages/state-manager/src/manager.ts).

### 2.1 Types

Supporting result types are defined in
[packages/state-manager/src/types.ts](packages/state-manager/src/types.ts):

- `StateMergeResult<T>` – shape: `{ effective: T }`.
- `StatePatchResult<T>` – shape: `{ newOverrides: T }`.

These are simple wrappers used to keep the public methods strongly typed and extensible (for example, to add diagnostics later).

### 2.2 Class `StateManager`

The public surface today is:

- `getEffectiveState<T>(baseline: T, overrides: Partial<T>): StateMergeResult<T>`
- `applyPatches<T>(baseline: T, overrides: Partial<T>, patches: Operation[]): StatePatchResult<T>`

Where `Operation` comes from `fast-json-patch` (`import { applyPatch, type Operation } from 'fast-json-patch'`).

#### `getEffectiveState`

`getEffectiveState`:

- Treats `baseline` as immutable JSON (for example, a template snapshot or stored profile).
- Performs a **deep merge** of `baseline` and `overrides` using a local `deepMerge` helper:
  - Objects are merged recursively.
  - Primitive values in `overrides` replace values in `baseline`.
  - Arrays are **not** treated specially; they are considered primitives by `isObject` and therefore entirely replaced when present in `overrides`.
- Returns `{ effective }`, where `effective` is the merged view that higher layers should use when they want the “current” state.

This method is intentionally generic and does not know about characters, settings, or any particular schema; callers supply strongly-typed generics such as `CharacterProfile` or `SettingProfile`.

#### `applyPatches`

`applyPatches` is scaffolded to support JSON Patch workflows:

1. Calls `getEffectiveState(baseline, overrides)` to compute the current effective state.
2. Deep-clones the effective state with `JSON.parse(JSON.stringify(effective))` to avoid mutating the original.
3. Applies the provided `patches` (array of `Operation`) to the clone using `fast-json-patch`’s `applyPatch`.
4. Returns `{ newOverrides }` where, for now, `newOverrides` is set to the entire patched effective state.

Important:

- The comments inside `applyPatches` explicitly describe a more refined design where only diffs vs `baseline` are persisted, but that diffing step is **not yet implemented**.
- As written, `newOverrides` represents a **full document** rather than a minimal set of overrides. Callers must decide how to persist or interpret it.

---

## 3. Relationship to Templates, Instances, and the DB

The template/instance model and persistence layer are described in
[dev-docs/05-state-and-persistence.md](dev-docs/05-state-and-persistence.md) and implemented in the `@minimal-rpg/db` package.

Key points from those docs/code:

- Templates (`character_profiles`, `setting_profiles`) are static JSONB documents.
- Instances (`character_instances`, `setting_instances`) are per-session state with:
  - `template_snapshot JSONB` – immutable copy captured at session creation.
  - `profile_json JSONB` – mutable per-session JSON document.

The State Manager **does not** talk to these tables directly. The intended usage is:

- **Baseline**: pass `template_snapshot` or `profile_json` as the `baseline` argument.
- **Overrides**: pass a separate overrides object (for example, per-session diffs) or treat `profile_json` itself as “overrides vs template_snapshot”, depending on how higher layers choose to model it.

Current implementation status:

- The API’s override endpoints (`/sessions/:id/overrides/character` and `/sessions/:id/overrides/setting`) implement their own deep-merge logic in the API layer today; they do **not** currently call into `@minimal-rpg/state-manager`.
- The Governor package depends on `@minimal-rpg/state-manager` conceptually, but no production path (API routes, web UI) invokes the Governor or State Manager yet.

As a result, the State Manager is presently an **isolated utility** that is ready to be adopted but not yet part of the main runtime loop.

---

## 4. Intended Turn-Level Usage

The intended usage pattern (as described in
[dev-docs/11-governor-and-agents.md](dev-docs/11-governor-and-agents.md) and in comments within `manager.ts`) is **per-turn, over freeform natural-language input**:

1. **Recall**

- Load `baseline` and `overrides` from persistence (for example, `template_snapshot` + `profile_json` or a template + override layer).
- Compute `effective` via `getEffectiveState` and hand that to the Governor/agents as the current state for this turn.

1. **Agent proposal**

- One or more agents generate JSON Patch operations (`Operation[]`) representing proposed state changes (movement, NPC reactions, inventory updates, time progression, etc.).
- Patches are defined relative to **effective** state, not necessarily the raw overrides layer.

1. **Commit**

- Use `applyPatches(baseline, overrides, patches)` to produce `newOverrides`.
- Persist `newOverrides` to the relevant store (for example, into `profile_json` for that instance, or into a dedicated overrides column once diffing is implemented).

In the current scaffold:

- All patch application happens in memory via `fast-json-patch`.
- It is up to the caller to decide whether `newOverrides` replaces an existing overrides document, replaces `profile_json` wholesale, or is further diffed/normalized before storage.

---

## 5. Embeddings and Knowledge Nodes: Current Reality

The broader design for embeddings and knowledge nodes is covered in
[dev-docs/06-knowledge-node-model.md](dev-docs/06-knowledge-node-model.md) and
[dev-docs/07-retrieval-and-scoring.md](dev-docs/07-retrieval-and-scoring.md).

From the perspective of the **current codebase**:

- `packages/db/sql/001_init.sql` defines `pgvector` support, but there are **no tables** that store embeddings for profiles, messages, or knowledge nodes.
- There is **no runtime code** that:
  - Computes embeddings.
  - Writes or reads vectors from Postgres.
  - Performs similarity search or retrieval based on embeddings.
- The State Manager does **not** reference any embedding APIs, models, or vector fields.

Embeddings and knowledge nodes are therefore a **future concern**. The State Manager is designed to be compatible with that direction (because it works with arbitrary JSON, not specific tables), but there is no implemented embedding lifecycle today.

---

## 6. How the State Manager Fits Into the Embedding Lifecycle (Planned)

Based on the design docs and comments in the governor/state-manager scaffolding, the planned (but not yet implemented) relationship to embeddings looks roughly like this:

### Source of truth

The State Manager operates over structured JSON documents (for example, character and setting profiles). These documents will eventually be decomposed into knowledge nodes for embedding and retrieval. Parsed attribute fields (for example, structured `appearance` and `personality` derived from free-text notes such as `appearanceNotes` / `personalityNotes`) are part of the same JSON document and are treated just like any other structured fields; the State Manager does not distinguish between "hand-authored" and "parsed" keys.

1. **Triggers for embedding updates**

- When `applyPatches` or other write paths produce `newOverrides` that materially change important fields (appearance, personality, goals, relationships, backstory, etc.), higher layers may:
  - Recompute one or more embeddings for affected nodes.
  - Write updated vectors to Postgres.
- Updates to `profile_json` are the primary trigger. This includes edits that come from the **free-text → partial profile** extraction pipeline (for example, inferring `appearance.hair.color` or `personality.traits` from `appearanceNotes` / `personalityNotes`).
- This triggering logic does **not** exist in code yet and is expected to live outside the State Manager.

1. **Recall path**

- A future retrieval layer would:
  - Use current effective state and recent input to construct a retrieval query.
  - Fetch relevant knowledge nodes (via similarity search) to include as context for agents.
- The State Manager itself only provides the structured base state used to derive or validate those nodes.

1. **Consistency guarantees**

- Once embeddings are wired in, there will be design questions about how quickly they must track changes in `newOverrides` and how to handle stale vectors.
- None of those policies are implemented yet; see TBD section.

---

## 7. Interaction with Other Packages

### 7.1 Governor

The Governor package ([packages/governor/src/governor.ts](packages/governor/src/governor.ts)) depends conceptually on `@minimal-rpg/state-manager` for state recall and commit.

Current status:

- `Governor.handleTurn` is a stub that logs the request and returns an echo-style response.
- No production code constructs a `StateManager` instance or passes it into the Governor.
- There is no place in the API or scripts where Governor + State Manager + DB are wired together.

So, while the Governor docs describe a full loop (intent → agents → JSON Patch → State Manager → DB), that loop is **not yet active**.

### 7.2 API Server

The API server ([packages/api/src](packages/api/src)) currently:

- Loads filesystem templates via `loadData`.
- Performs DB CRUD for templates, sessions, instances, and messages.
- Handles character/setting overrides using bespoke merge logic in the routes layer.

It does **not** import or use `@minimal-rpg/state-manager` at this time.

### 7.3 Web/UI and Other Packages

- The web client and utility packages do not reference the State Manager or any embedding logic.
- The `@minimal-rpg/db` package has some pgvector wiring, but no higher-level embedding lifecycle.

---

## 8. Current Guarantees and Limitations

Given the present implementation:

- `StateManager.getEffectiveState` provides a deterministic deep-merged view of `baseline` + `overrides` for plain JSON objects.
- `StateManager.applyPatches`:
  - Correctly applies JSON Patch operations to a cloned effective state in memory.
  - Returns a `newOverrides` document that callers can persist, but does **not** try to minimize diffs vs `baseline`.
- There is no built-in support for:
  - Concurrency control or versioning.
  - Partial failure handling or validation against Zod schemas.
  - Embedding computation, retrieval, or storage.

All of those concerns are delegated to the layers that call the State Manager or are simply not implemented yet.

---

## 9. TBD / Open Questions

The following aspects are intentionally left as TBD because they are not implemented and cannot be inferred safely from the current codebase:

- **Override modeling vs. full documents**
  - Whether `profile_json` should be treated as the full effective state or as a minimal overrides layer relative to `template_snapshot`.
  - Whether `applyPatches` should eventually compute true diffs vs `baseline` to keep overrides compact.

- **StateManager ↔ DB integration**
  - Exact helper functions or services that will connect `StateManager` to the `@minimal-rpg/db` API.
  - How errors and validation (for example, via Zod schemas) will be surfaced.

- **Embedding lifecycle wiring**
  - When and where embeddings are computed, updated, or deleted in response to state changes.
  - Table names, schemas, and index choices for storing vectors.
  - Policies for handling stale embeddings when state changes faster than vectors are refreshed.

- **Governor/state-manager contracts**
  - Concrete TypeScript interfaces for how the Governor will call into the State Manager (method names, argument shapes, error contracts).
  - How multiple agents’ patches are combined and resolved before being passed to `applyPatches`.

- **Performance and data-shape constraints**
  - Maximum expected size/complexity of state documents passed through the State Manager.
  - Whether we need more efficient cloning/diffing strategies than `JSON.parse(JSON.stringify(...))` and full-document overrides.

This document should be updated once:

- The Governor is wired into the API/session loop.
- A first end-to-end integration between State Manager, DB, and (optionally) embeddings is implemented.
