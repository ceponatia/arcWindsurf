# @minimal-rpg/state-manager

This package handles the merging of static template data (baseline) with dynamic session data (overrides) to produce an "Effective State". It also handles the application of state updates via JSON Patch.

## Responsibilities

- **Merge**: `baseline` + `overrides` -> `effectiveState`
- **Patch**: `overrides` + `patches` -> `newOverrides`
- **Validation**: Ensure updates conform to schemas (optional/future).

## Usage

```typescript
import { StateManager } from '@minimal-rpg/state-manager';

const manager = new StateManager();
const effective = manager.getEffectiveState(baseline, overrides);
const newOverrides = manager.applyPatches(overrides, patches);
```
