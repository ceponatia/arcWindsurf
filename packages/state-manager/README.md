# @minimal-rpg/state-manager

Pure, in-memory state management for the governor system. Handles merging baseline templates with session overrides and applying JSON Patch (RFC 6902) mutations.

## Design

See [dev-docs/12-state-manager-and-embedding-lifecycle.md](../../dev-docs/12-state-manager-and-embedding-lifecycle.md) for the full design including:

- **State Slice Architecture**: Extensible registry for adding new state categories (proximity, inventory, dialogue)
- **Tool-Calling Integration**: State patches flow from LLM tool execution
- **Turn Lifecycle**: Load → tool execution → patch collection → persist

## Features

- **Merge**: Deep-merge `baseline` + `overrides` → `effectiveState`
- **Patch**: Apply JSON Patch operations and compute minimal diff
- **Diff**: Compare two state objects and get structural differences
- **Validate**: Optional Zod schema validation for type safety
- **Strongly typed**: Full TypeScript support with generics

## Installation

```bash
pnpm add @minimal-rpg/state-manager
```

## Usage

### Merge baseline and overrides

```typescript
import { StateManager } from '@minimal-rpg/state-manager';

const manager = new StateManager();

const baseline = {
  name: 'Aria',
  stats: { health: 100, mana: 50 },
  tags: ['hero'],
};

const overrides = {
  stats: { mana: 30 }, // Only mana changed
};

const { effective, overriddenPaths } = manager.getEffectiveState(baseline, overrides);
// effective = { name: 'Aria', stats: { health: 100, mana: 30 }, tags: ['hero'] }
// overriddenPaths = ['stats.mana']
```

### Apply JSON Patches

```typescript
import type { Operation } from '@minimal-rpg/state-manager';

const patches: Operation[] = [
  { op: 'replace', path: '/stats/health', value: 80 },
  { op: 'add', path: '/stats/stamina', value: 100 },
];

const result = manager.applyPatches(baseline, overrides, patches);
// result.newEffective = merged + patched state
// result.newOverrides = minimal diff to persist
// result.modifiedPaths = ['stats.health', 'stats.stamina']
```

### With Zod validation

```typescript
import { z } from 'zod';

const CharacterSchema = z.object({
  name: z.string(),
  stats: z.object({
    health: z.number().min(0).max(100),
    mana: z.number().min(0),
  }),
});

// Validate during merge
const { effective } = manager.getEffectiveState(baseline, overrides, {
  schema: CharacterSchema,
});

// Validate after patches
const result = manager.applyPatches(baseline, overrides, patches, {
  schema: CharacterSchema,
});
```

### Configuration

```typescript
const manager = new StateManager({
  computeMinimalDiff: true, // Compute minimal overrides (default: true)
  validatePatches: false, // Validate patches before applying (default: false)
  allowPartialFailure: false, // Continue on patch failures (default: false)
});
```

## API

### `StateManager`

| Method                                                 | Description                                  |
| ------------------------------------------------------ | -------------------------------------------- |
| `getEffectiveState(baseline, overrides, options?)`     | Merge baseline with overrides                |
| `applyPatches(baseline, overrides, patches, options?)` | Apply JSON Patches and compute new overrides |
| `diff(original, modified)`                             | Compare two objects and get differences      |
| `validate(data, schema)`                               | Validate data against a Zod schema           |

### Types

| Type                  | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `JsonValue`           | Valid JSON-serializable value                           |
| `DeepPartial<T>`      | Recursive partial type                                  |
| `Operation`           | JSON Patch operation (re-exported from fast-json-patch) |
| `StateMergeResult<T>` | Result of `getEffectiveState`                           |
| `StatePatchResult<T>` | Result of `applyPatches`                                |
| `DiffResult<T>`       | Result of `diff`                                        |

## Merge Semantics

- **Objects**: Deep-merge recursively
- **Arrays**: Replace wholesale (no element-wise merge)
- **Primitives**: Override wins

---

## Slice Authoring Guide

Adding a new state slice involves three steps: define the schema, register it, and wire persistence.

### Step 1: Define the Schema

Create a Zod schema in `@minimal-rpg/schemas`. Place session-only state in `src/state/`, persistent state with the domain schemas.

```typescript
// packages/schemas/src/state/dialogue.ts
import { z } from 'zod';

export const DialogueStateSchema = z.object({
  /** Current conversation topic */
  currentTopic: z.string().optional(),
  /** NPC's emotional disposition toward player (0-100) */
  disposition: z.number().min(0).max(100),
  /** Tone of recent exchanges */
  tone: z.enum(['friendly', 'neutral', 'hostile', 'flirty']),
});
export type DialogueState = z.infer<typeof DialogueStateSchema>;

export function createDefaultDialogueState(): DialogueState {
  return { disposition: 50, tone: 'neutral' };
}
```

Export from the state index:

```typescript
// packages/schemas/src/state/index.ts
export * from './proximity.js';
export * from './dialogue.js';
```

### Step 2: Register the Slice

Register your slice with the state manager at application startup:

```typescript
import { stateManager } from '@minimal-rpg/state-manager';
import { DialogueStateSchema, createDefaultDialogueState } from '@minimal-rpg/schemas';

stateManager.registerSlice({
  key: 'dialogue',
  schema: DialogueStateSchema,
  defaultState: createDefaultDialogueState(),
  mergeStrategy: 'deep', // or 'replace' for full overwrites
});
```

### Step 3: Wire Persistence

Decide if your slice is **session-only** or **persistent**:

| Category     | Storage                  | When to Use                      |
| ------------ | ------------------------ | -------------------------------- |
| Session-only | `SessionStateCache`      | Transient context (proximity)    |
| Persistent   | Postgres via `instances` | Survives session end (inventory) |

**Session-only slices**: Update `state-cache.ts` to include your slice type and `state-loader.ts` / `state-persister.ts` to load/save it.

**Persistent slices**: Add DB columns or use the existing instance override pattern.

### Step 4: Emit State Patches from Tools

Tools return `statePatches` that the turn handler applies:

```typescript
// In your tool executor
return {
  success: true,
  statePatches: {
    dialogue: [
      { op: 'replace', path: '/tone', value: 'flirty' },
      { op: 'replace', path: '/disposition', value: 75 },
    ],
  },
};
```

The governor collects all patches and applies them via `StateManager.applyPatches()` at turn end.

### Slice Key Conventions

| Key         | Purpose                         | Persistence   |
| ----------- | ------------------------------- | ------------- |
| `character` | NPC profile, personality        | DB (instance) |
| `setting`   | Location, atmosphere            | DB (instance) |
| `proximity` | Sensory engagements             | Session-only  |
| `dialogue`  | Conversation state, disposition | Session-only  |
| `inventory` | Player/NPC items                | DB (instance) |
| `time`      | In-game time, turn counter      | DB (instance) |

---

## Testing

```bash
pnpm test        # Run tests
pnpm build       # Build with tsc
```

## Dependencies

- `fast-json-patch` — RFC 6902 JSON Patch implementation
- `zod` — Runtime schema validation
