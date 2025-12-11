# State Manager and Tool-Calling Integration

This document describes the redesigned `@minimal-rpg/state-manager` package with a focus on extensibility and integration with the LLM tool-calling system.

---

## 1. Design Goals

1. **Extensible State Slices** - Add new state categories (proximity, inventory, dialogue history) without refactoring the core manager.
2. **Tool-Aware Updates** - State changes flow from tool execution results, not brittle rule-based parsers.
3. **Per-Turn Lifecycle** - State is loaded at turn start, updated via tools, and persisted at turn end.
4. **Schema-Driven Validation** - Each state slice has a Zod schema; the manager validates but doesn't hard-code slice types.

---

## 2. Current Implementation

The existing `StateManager` class in [manager.ts](../packages/state-manager/src/manager.ts) provides:

- `getEffectiveState(baseline, overrides)` - Deep merge baseline + overrides
- `applyPatches(baseline, overrides, patches)` - Apply JSON Patch operations and compute minimal diffs
- `diff(original, modified)` - Compute differences between two states
- `validate(state, schema)` - Validate against Zod schemas

The implementation already supports minimal diff computation, schema validation, and partial failure handling. The redesign builds on this foundation.

---

## 3. State Slice Architecture

Instead of monolithic character/setting state objects, the state manager works with **registered slices** - independent state categories with their own schemas and merge strategies.

```typescript
// Conceptual API
interface StateSlice<T> {
  /** Unique key for this slice (e.g., 'proximity', 'inventory', 'dialogue') */
  key: string;

  /** Zod schema for validation */
  schema: ZodSchema<T>;

  /** Default/empty state */
  defaultState: T;

  /** How to merge baseline + overrides (deep-merge is default) */
  mergeStrategy?: 'deep' | 'replace' | 'custom';

  /** Optional custom merge function */
  customMerge?: (baseline: T, overrides: DeepPartial<T>) => T;
}
```

### 3.1 Built-in Slices (Planned)

| Slice Key   | Purpose                                            | Persistence   |
| ----------- | -------------------------------------------------- | ------------- |
| `character` | NPC profile, personality, appearance               | DB (instance) |
| `setting`   | Location details, atmosphere                       | DB (instance) |
| `proximity` | Active sensory engagements between player and NPCs | Session-only  |
| `inventory` | Player/NPC items                                   | DB (instance) |
| `dialogue`  | Recent conversation state, tone, NPC disposition   | Session-only  |
| `timeline`  | In-game time, event log                            | DB (instance) |

### 3.2 Adding a New Slice

```typescript
// packages/schemas/src/state/proximity.ts
import { z } from 'zod';

export const SensoryEngagementSchema = z.object({
  npcId: z.string(),
  bodyPart: z.string(),
  senseType: z.enum(['look', 'touch', 'smell', 'taste', 'hear']),
  intensity: z.enum(['casual', 'focused', 'intimate']),
  startedAt: z.number(), // turn number or timestamp
  lastActiveAt: z.number(),
});

export const ProximityStateSchema = z.object({
  /** Active sensory engagements keyed by `${npcId}:${bodyPart}:${senseType}` */
  engagements: z.record(z.string(), SensoryEngagementSchema),
  /** General proximity level to each NPC */
  npcProximity: z.record(z.string(), z.enum(['distant', 'near', 'close', 'intimate'])),
});

export type SensoryEngagement = z.infer<typeof SensoryEngagementSchema>;
export type ProximityState = z.infer<typeof ProximityStateSchema>;
```

Register at runtime:

```typescript
stateManager.registerSlice({
  key: 'proximity',
  schema: ProximityStateSchema,
  defaultState: { engagements: {}, npcProximity: {} },
  mergeStrategy: 'deep',
});
```

---

## 4. Tool-Calling Integration

### 4.1 State Updates from Tool Results

Tools execute and return structured results. Some tools produce **state patches** that the state manager applies.

```typescript
interface ToolResult {
  success: boolean;
  error?: string;
  /** Optional state patches to apply */
  statePatches?: StatePatches;
  /** Data for narrative generation */
  [key: string]: unknown;
}

interface StatePatches {
  /** Key is slice name, value is JSON Patch operations */
  [sliceKey: string]: Operation[];
}
```

Example: `get_sensory_detail` tool returns proximity updates:

```typescript
// In SensoryAgent.getSensoryDetail()
return {
  success: true,
  narrative_hints: ['her foot smells faintly of lavender...'],
  statePatches: {
    proximity: [
      {
        op: 'add',
        path: '/engagements/taylor:foot:smell',
        value: {
          npcId: 'taylor',
          bodyPart: 'foot',
          senseType: 'smell',
          intensity: 'focused',
          startedAt: currentTurn,
          lastActiveAt: currentTurn,
        },
      },
    ],
  },
};
```

### 4.2 Turn Lifecycle with Tools

```text
+-------------------------------------------------------------+
|                        TURN START                           |
+-------------------------------------------------------------+
|  1. Load state slices from DB/session                       |
|  2. Compute effective state (baseline + overrides)          |
|  3. Pass effective state to ToolBasedTurnHandler            |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                    TOOL EXECUTION LOOP                      |
+-------------------------------------------------------------+
|  LLM receives:                                              |
|    - System prompt with active state context                |
|    - Player input                                           |
|    - Tool definitions                                       |
|                                                             |
|  For each tool call:                                        |
|    1. Execute tool (SensoryAgent, NpcAgent, etc.)           |
|    2. Collect tool result + any statePatches                |
|    3. Apply patches to in-memory state immediately          |
|    4. Feed result back to LLM for next iteration            |
|                                                             |
|  LLM generates final narrative                              |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                        TURN END                             |
+-------------------------------------------------------------+
|  1. Collect all state patches from tool results             |
|  2. Compute new overrides via StateManager.applyPatches()   |
|  3. Persist updated state to DB/session                     |
|  4. Return TurnResult with narrative + state changes        |
+-------------------------------------------------------------+
```

### 4.3 State Context in System Prompt

The `ToolBasedTurnHandler` includes active state in the system prompt so the LLM can reason about it:

```typescript
private buildStateContext(): string {
  const proximity = this.stateSlices.proximity;
  if (!proximity || Object.keys(proximity.engagements).length === 0) {
    return '';
  }

  const activeEngagements = Object.values(proximity.engagements)
    .filter(e => e.lastActiveAt >= currentTurn - 2) // Recent engagements
    .map(e => `- ${e.senseType} engaged with ${e.npcId}'s ${e.bodyPart} (${e.intensity})`)
    .join('\n');

  return `
## Active Sensory Context
The following sensory engagements are currently active:
${activeEngagements}

Continue to acknowledge these in your narrative. If the player moves away or the NPC withdraws, call update_proximity to end the engagement.
`;
}
```

---

## 5. Proximity State Design

### 5.1 Purpose

Track ongoing physical/sensory relationships between player and NPCs across turns. This enables:

- **Continuous sensory details**: If player's face is near NPC's foot, continue describing relevant sensations without re-prompting.
- **Context-aware NPC reactions**: NPC knows the proximity state and can react naturally.
- **Natural disengagement**: LLM can call `update_proximity` to end engagements when narratively appropriate.

### 5.2 Engagement Lifecycle

```text
1. INITIATION
   Player: "He leans in to smell her hair"
   -> LLM calls get_sensory_detail(smell, taylor, hair)
   -> Tool returns statePatches adding engagement
   -> Engagement: { npcId: 'taylor', bodyPart: 'hair', senseType: 'smell', intensity: 'focused' }

2. CONTINUATION
   Player: "He breathes deeply"
   -> LLM sees active hair:smell engagement in context
   -> LLM generates narrative with continued sensory details
   -> No tool call needed (engagement already active)
   -> lastActiveAt updated to current turn

3. ESCALATION
   Player: "He buries his face in her hair"
   -> LLM calls update_proximity(taylor, hair, smell, intimate)
   -> Engagement intensity updated

4. DISENGAGEMENT (player-initiated)
   Player: "He steps back"
   -> LLM calls update_proximity(taylor, hair, smell, ended)
   -> Engagement removed from state

5. DISENGAGEMENT (NPC-initiated)
   NPC pulls away in dialogue
   -> NpcAgent returns statePatches removing engagement
   -> LLM acknowledges in narrative
```

### 5.3 New Tool: `update_proximity`

```typescript
const UPDATE_PROXIMITY_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_proximity',
    description: 'Update the proximity/engagement state between player and an NPC body part',
    parameters: {
      type: 'object',
      properties: {
        npcId: { type: 'string', description: 'The NPC identifier' },
        bodyPart: { type: 'string', description: 'The body part involved' },
        senseType: {
          type: 'string',
          enum: ['look', 'touch', 'smell', 'taste', 'hear'],
          description: 'The sense being engaged',
        },
        action: {
          type: 'string',
          enum: ['engage', 'intensify', 'reduce', 'end'],
          description: 'What change to make',
        },
        newIntensity: {
          type: 'string',
          enum: ['casual', 'focused', 'intimate'],
          description: 'New intensity level (for engage/intensify/reduce)',
        },
      },
      required: ['npcId', 'bodyPart', 'senseType', 'action'],
    },
  },
};
```

---

## 6. Redesigned StateManager API

### 6.1 Core Interface

```typescript
interface StateManager {
  /** Register a new state slice with its schema */
  registerSlice<T>(slice: StateSlice<T>): void;

  /** Get effective state for a slice (baseline + overrides) */
  getEffective<T>(sliceKey: string, baseline: T, overrides: DeepPartial<T>): T;

  /** Apply patches to a slice, returning new overrides */
  applyPatches<T>(
    sliceKey: string,
    baseline: T,
    overrides: DeepPartial<T>,
    patches: Operation[]
  ): StatePatchResult<T>;

  /** Apply patches from multiple slices in one operation */
  applyMultiSlicePatches(
    slices: Map<string, { baseline: unknown; overrides: unknown }>,
    patches: StatePatches
  ): MultiSlicePatchResult;

  /** Validate state against its registered schema */
  validate<T>(sliceKey: string, state: T): ValidationResult<T>;
}
```

### 6.2 Multi-Slice Patch Application

Tool results may update multiple slices. The state manager handles this atomically:

```typescript
interface MultiSlicePatchResult {
  /** Results per slice */
  results: Map<string, StatePatchResult<unknown>>;

  /** Whether all patches succeeded */
  allSucceeded: boolean;

  /** Slices that failed (for partial failure mode) */
  failedSlices?: string[];
}
```

---

## 7. Persistence Strategy

### 7.1 Session vs. Persistent State

| Category   | Storage            | Lifetime                    |
| ---------- | ------------------ | --------------------------- |
| Persistent | Postgres instances | Survives session boundaries |
| Session    | In-memory / Redis  | Current session only        |

**Persistent slices**: `character`, `setting`, `inventory`, `timeline`
**Session slices**: `proximity`, `dialogue`, transient context

### 7.2 State Loading Flow

```typescript
async function loadStateForTurn(sessionId: string): Promise<TurnStateContext> {
  // 1. Load persistent state from DB
  const characterInstance = await db.getCharacterInstance(sessionId);
  const settingInstance = await db.getSettingInstance(sessionId);

  // 2. Load session state from cache/memory
  const sessionState = sessionStore.get(sessionId) ?? createDefaultSessionState();

  // 3. Build TurnStateContext with all slices
  return {
    slices: {
      character: {
        baseline: characterInstance.template_snapshot,
        overrides: characterInstance.profile_json,
      },
      setting: {
        baseline: settingInstance.template_snapshot,
        overrides: settingInstance.profile_json,
      },
      proximity: {
        baseline: DEFAULT_PROXIMITY_STATE,
        overrides: sessionState.proximity ?? {},
      },
      // ... other slices
    },
  };
}
```

---

## 8. Implementation Plan

### Phase 1: Slice Registry (Current Sprint)

- [x] Refactor `StateManager` to use slice registry pattern
- [x] Add `registerSlice()` method
- [x] Keep existing `getEffectiveState()` and `applyPatches()` working
- [x] Add `applyMultiSlicePatches()` for batch updates

### Phase 2: Proximity State

- [x] Define `ProximityStateSchema` in `@minimal-rpg/schemas`
- [x] Add `update_proximity` tool definition
- [x] Implement `ProximityManager` (thin wrapper for proximity-specific logic)
- [x] Update `ToolExecutor` to collect and apply state patches

### Phase 3: Tool-State Integration

- [x] Modify `ToolBasedTurnHandler` to:
  - Include active state context in system prompt
  - Collect `statePatches` from all tool results
  - Apply patches at turn end
- [x] Add state context injection to existing tools (`get_sensory_detail`, `npc_dialogue`)

### Phase 4: Persistence Wiring

- [x] Create `StateLoader` service for turn-start state loading
- [x] Create `StatePersister` service for turn-end state saving
- [x] Add session state cache (in-memory or Redis)
- [x] Wire into `POST /sessions/:id/turns` route

### Phase 5: Cleanup and Testing

- [x] Remove legacy override endpoints that bypass state manager
- [x] Document slice authoring guide in state manager README.md and schema/state README.md

---

## 9. Migration Notes

### From Current Implementation

The current `StateManager` already supports:

- Deep merge via `getEffectiveState()`
- JSON Patch application via `applyPatches()`
- Minimal diff computation
- Schema validation

Changes needed:

1. Add slice registry (additive, backward-compatible)
2. Add `statePatches` field to tool result types
3. Update `ToolBasedTurnHandler` to process patches

No breaking changes to existing API surface.

---

## 10. Open Questions (Resolved)

### Conflict Resolution

**Question**: If two tools update the same slice path in one turn, which wins?

**Current behavior**: Last write wins via sequential patch application.

**Analysis**: This is acceptable for most cases because:

1. **Tool execution is sequential** - The governor processes tool calls one at a time, so patches are applied in a deterministic order.
2. **LLM has context** - Each subsequent tool call sees the result of previous tools, so the LLM can make informed decisions.
3. **Semantic ordering matters** - If `get_sensory_detail` sets intensity to `focused` and then `update_proximity` sets it to `intimate`, the escalation is intentional.

**When this breaks down**:

- Parallel tool execution (not currently supported)
- Independent agents updating the same state without coordination

**Potential future strategies**:

- **Merge patches**: For additive operations (e.g., adding to arrays), merge rather than replace
- **Conflict markers**: Detect conflicts and return them to the LLM for resolution
- **Priority system**: Assign priority to tool categories (NPC agent > sensory agent)
- **Optimistic locking**: Include version numbers in patches, reject stale updates

**Recommendation**: Keep last-write-wins for now. Add conflict detection logging to identify problematic patterns in production.

---

### Stale Engagement Cleanup

**Question**: Should we auto-expire engagements after N turns of inactivity?

**Answer**: Yes, but with intelligent, context-aware cleanup rather than blind expiration.

**Design Principles**:

1. **LLM-driven disengagement** - The NPC or narrative should naturally break off or progress engagements. The LLM sees `lastActiveAt` in context and can call `update_proximity(action: 'end')`.

2. **Anatomical coherence** - When posture/position changes, incompatible engagements should auto-invalidate. Example:
   - NPC goes from lying down → straddling player's lap
   - Engagement `npc:feet:smell` with player's face becomes anatomically impossible
   - System should flag or remove incompatible engagements

3. **Hybrid approach**:
   - **Soft expiry (warning)**: After 3 turns of inactivity, include a hint in the system prompt: "The following engagement appears stale: [engagement]. Consider ending it naturally or re-engaging."
   - **Hard expiry (auto-remove)**: After 6+ turns, auto-remove with a narrative hook: "As the moment passed, [npc] shifted away..."

**Implementation Sketch**:

```typescript
interface EngagementCleanupConfig {
  softExpiryTurns: number; // Default: 3 - Add prompt hint
  hardExpiryTurns: number; // Default: 6 - Auto-remove
  postureDependencies: Map<string, string[]>; // bodyPart → required postures
}

function validateEngagementCoherence(
  engagement: SensoryEngagement,
  npcPosture: string,
  playerPosition: string
): 'valid' | 'stale' | 'impossible';
```

**Body Map Integration**: This ties into the body map system (dev-doc 19). When body positions update, run coherence validation on active engagements.

---

### Embedding Sync

**Question**: When state changes, how/when do we update related embeddings?

**Context**: The retrieval system uses embeddings to find relevant knowledge, character traits, and context. When state changes (e.g., NPC personality shifts, location changes), the embeddings that represent that content may become stale.

**Types of Embedding-Relevant State**:

| State Type                   | Embedding Impact                      | Update Strategy                       |
| ---------------------------- | ------------------------------------- | ------------------------------------- |
| Character personality/traits | High - affects similarity matching    | Re-embed changed fields               |
| Character appearance         | Medium - affects sensory descriptions | Re-embed on significant change        |
| Location description         | High - affects scene context          | Re-embed when location changes        |
| Dialogue history             | Low - typically not embedded          | Summarize periodically, embed summary |
| Proximity/engagements        | None - transient runtime state        | No embedding needed                   |

**Sync Strategies**:

1. **Immediate (sync)**: Re-embed on every state change. Simple but expensive, may slow down turns.

2. **Deferred (async queue)**: Queue embedding updates for background processing. State and embeddings may be temporarily inconsistent.

3. **On-demand (lazy)**: Only re-embed when the affected knowledge is actually retrieved. Risk of stale results.

4. **Hybrid (dirty flag)**: Mark embeddings as stale when state changes. Re-embed lazily but prioritize stale items in retrieval scoring.

**Recommended Approach** (for future sprint):

```typescript
interface EmbeddingSync {
  // Called when state patches are applied
  markStale(sliceKey: string, paths: string[]): void;

  // Background worker processes stale queue
  processStaleQueue(batchSize: number): Promise<void>;

  // Retrieval penalizes stale embeddings
  getStalePenalty(embeddingId: string): number;
}
```

**Implementation Notes**:

- Most state changes don't affect embeddings (proximity, dialogue tone)
- Character personality changes are rare and warrant immediate re-embedding
- Location description changes are moderate frequency, defer OK
- Add `embeddingsAffected: string[]` field to state patches to track which embeddings need refresh
