# @minimal-rpg/state-manager

Pure, in-memory state management for the governor system. Handles merging baseline templates with session overrides and applying JSON Patch (RFC 6902) mutations.

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

## Testing

```bash
pnpm test        # Run tests
pnpm build       # Build with tsc
```

## Dependencies

- `fast-json-patch` — RFC 6902 JSON Patch implementation
- `zod` — Runtime schema validation
