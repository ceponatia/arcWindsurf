# Governor State Management & Orchestration

This document outlines how the **Governor** architecture manages persistent game state (character attributes, setting details, relationships) using the template + snapshot instance pattern.

## 1. Core Concept: Template Snapshots + Mutable Profiles

The database (`packages/db`) now separates immutable templates from per-session state:

- **Templates** (`character_profiles`, `setting_profiles`): Static, canonical JSON stored once per template.
- **Instances** (`character_instances`, `setting_instances`): Session-specific snapshots.
  - `template_snapshot`: The template JSON captured when the session starts (never mutated).
  - `profile_json`: The current, fully merged profile for the session. Override operations update this document in place.

**The Governor's Role:**
The Governor computes the **Effective State** (using the `profile_json` snapshot) for agents and commits new deltas back into `profile_json`. Templates remain pristine, so new sessions always start from the latest template while in-flight sessions retain their snapshot.

## 2. Orchestration Flow

### Step 1: Context Assembly (Recall)

Before invoking a specialized agent (e.g., NPC Agent, Map Agent), the Governor must assemble the relevant context.

1. **Identify Entities:** Based on the player's intent (e.g., "Talk to Eldrin"), identify which `characterInstance` or `settingInstance` is needed.
2. **Fetch & Merge:**
   - Load the `characterInstance` from the DB.
   - Compute `EffectiveProfile = deepMerge(templateSnapshot, profileJson)` if you need to reconcile with updated templates, otherwise use `profileJson` directly (it already reflects all mutations).
   - _Note: This reconciliation should happen in a utility layer (e.g., `StateService`), not inside the LLM prompt._

3. **Prompt Construction:**
   - Pass the `EffectiveProfile` to the agent.
   - This ensures the agent sees the _current_ state (e.g., `trust: 5` instead of the template `trust: 0`).

### Step 2: Agent Execution & Delta Generation

Agents should not write to the DB directly. Instead, they return **Structured State Changes** using **JSON Patch (RFC 6902)**.

- **Input:** Prompt with Effective State.
- **Output:**
  - `narrative`: "Eldrin smiles warmly."
  - `state_updates`: `[{ "op": "replace", "path": "/relationships/player/trust", "value": 5 }]`

### Step 3: State Commit (Update)

The Governor receives the `state_updates` and applies them.

1. **Load Current Snapshot:** Fetch the current `profile_json` for the target entity.
2. **Apply Delta:** Apply the JSON Patch operations to the snapshot object.
   - _Example:_ If `profile_json` was `{...}` and patch is `replace /relationships/player/trust` with `5`, the updated snapshot carries the new value while leaving untouched fields as-is.

3. **Persist:** Write the updated `profile_json` back to the `character_instances` table via `db.characterInstance.update`.

## 3. Detailed Architecture

### 3.1. The `StateService` (Potential Package)

We should introduce a `StateService` to handle the logic. This could live in `packages/api/src/services/state.ts` or be extracted into a dedicated package `packages/state-manager`.

**Recommendation:** Extract to `packages/state-manager`.

- **Pros:** Decouples complex merging/patching logic from the API; easier to test in isolation; reusable by future CLI tools or workers.
- **Cons:** Slight overhead of managing another package.

```typescript
// Conceptual Interface
import { Operation } from 'fast-json-patch';

interface StateManager {
  // Returns template snapshot + live profile merged
  getEffectiveCharacter(sessionId: string, charId: string): Promise<CharacterProfile>;

  // Updates specific fields in the overrides using JSON Patch
  updateCharacterState(sessionId: string, charId: string, patches: Operation[]): Promise<void>;
}
```

### 3.2. Governor Loop Example

```typescript
async function handleTurn(sessionId: string, input: string) {
  // 1. Intent: "Talk to Eldrin"
  const intent = await governorLLM.predictIntent(input);

  // 2. Recall: Get Eldrin's current state
  const eldrinProfile = await stateService.getEffectiveCharacter(sessionId, 'eldrin');

  // 3. Agent: Generate response + changes
  const { response, changes } = await npcAgent.generate(eldrinProfile, input);

  // 4. Update: Commit changes to DB
  if (changes) {
    await stateService.updateCharacterState(sessionId, 'eldrin', changes);
  }

  // 5. Respond
  return response;
}
```

## 4. Handling Complex Data Types

### Arrays (Inventory, Tags)

Updating arrays within the JSONB `profile_json` snapshot can be tricky.

- **Strategy:** The LLM should return the _entire new array_ if it changes, or we support specific operations like `push`/`remove` in the `state_updates` structure.
- **Recommendation:** Start with "replace whole array" for simplicity. If the agent adds an item, it returns the full new inventory list.

### Nested Fields

Use a deep merge strategy (like `lodash.merge` or a custom recursive merge) when combining the immutable snapshot with incremental updates. When updating, ensure we don't overwrite unrelated siblings in the stored `profile_json`.

## 5. Future Optimizations

- **Vector Memory:** For long-term recall (e.g., "What did we talk about last week?"), we can store summarized events in a vector store (pgvector is already set up in `packages/db`).
- **Optimistic Locking:** If multiple agents run in parallel, we might need version checks on the `overrides` column, though for a turn-based RPG, sequential processing is likely sufficient.
