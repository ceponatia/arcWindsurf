# Governor State Management & Orchestration

This document outlines how the **Governor** architecture manages persistent game state (character attributes, setting details, relationships) using the existing `baseline` + `overrides` database pattern.

## 1. Core Concept: Baseline vs. Overrides

The database (`packages/db`) already supports a split between static data and dynamic state:

- **Templates** (`character_templates`, `setting_templates`): Static, immutable source data (JSON).
- **Instances** (`character_instances`, `setting_instances`): Session-specific data.
  - `baseline`: A copy of the template data at instantiation.
  - `overrides`: A JSON blob containing _only_ the fields that have changed during the session.

**The Governor's Role:**
The Governor is responsible for computing the **Effective State** (Baseline + Overrides) for agents and committing new **State Deltas** (updates to Overrides) back to the database.

## 2. Orchestration Flow

### Step 1: Context Assembly (Recall)

Before invoking a specialized agent (e.g., NPC Agent, Map Agent), the Governor must assemble the relevant context.

1. **Identify Entities:** Based on the player's intent (e.g., "Talk to Eldrin"), identify which `characterInstance` or `settingInstance` is needed.
2. **Fetch & Merge:**
   - Load the `characterInstance` from the DB.
   - Compute `EffectiveProfile = deepMerge(instance.baseline, instance.overrides)`.
   - _Note: This merging should happen in a utility layer (e.g., `StateService`), not inside the LLM prompt._
3. **Prompt Construction:**
   - Pass the `EffectiveProfile` to the agent.
   - This ensures the agent sees the _current_ state (e.g., `trust: 5` instead of the baseline `trust: 0`).

### Step 2: Agent Execution & Delta Generation

Agents should not write to the DB directly. Instead, they return **Structured State Changes** using **JSON Patch (RFC 6902)**.

- **Input:** Prompt with Effective State.
- **Output:**
  - `narrative`: "Eldrin smiles warmly."
  - `state_updates`: `[{ "op": "replace", "path": "/relationships/player/trust", "value": 5 }]`

### Step 3: State Commit (Update)

The Governor receives the `state_updates` and applies them.

1. **Load Current Overrides:** Fetch the current `overrides` JSON for the target entity.
2. **Apply Delta:** Apply the JSON Patch operations to the `overrides` object.
   - _Example:_ If `overrides` was `{}` and patch is `replace /relationships/player/trust` with `5`, new `overrides` is `{ "relationships": { "player": { "trust": 5 } } }`.
3. **Persist:** Write the new `overrides` JSON back to the `character_instances` table via `db.characterInstance.update`.

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
  // Returns Baseline + Overrides merged
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

Updating arrays in a JSONB `overrides` column can be tricky.

- **Strategy:** The LLM should return the _entire new array_ if it changes, or we support specific operations like `push`/`remove` in the `state_updates` structure.
- **Recommendation:** Start with "replace whole array" for simplicity. If the agent adds an item, it returns the full new inventory list.

### Nested Fields

Use a deep merge strategy (like `lodash.merge` or a custom recursive merge) when combining `baseline` and `overrides`.

- When updating, ensure we don't overwrite unrelated siblings in the `overrides` JSON.

## 5. Future Optimizations

- **Vector Memory:** For long-term recall (e.g., "What did we talk about last week?"), we can store summarized events in a vector store (pgvector is already set up in `packages/db`).
- **Optimistic Locking:** If multiple agents run in parallel, we might need version checks on the `overrides` column, though for a turn-based RPG, sequential processing is likely sufficient.
