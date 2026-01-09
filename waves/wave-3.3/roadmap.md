# Wave 3.3: Fix simulation-hooks.ts (143 Errors)

This wave fixes all lint errors in `packages/api/src/services/simulation-hooks.ts`.

---

## Prerequisites

- **Wave 3.2 MUST be completed first** (creates foundation utilities)

## Target File

`packages/api/src/services/simulation-hooks.ts` - 143 lint errors

## Error Categories in This File

| Error Type | Count | Fix |
|------------|-------|-----|
| Missing type imports | ~50 | Add imports from @minimal-rpg/schemas |
| `as any` UUID casts | ~30 | Use `toSessionId()` helper |
| `as any` state access | ~50 | Use `asNpcState()` helper |
| Duplicate functions | ~10 | Delete duplicate definitions |
| `\|\|` vs `??` | ~3 | Replace with nullish coalescing |

---

## Task 1: Add Missing Type Imports

**Location**: Top of file (after existing imports, around line 18)

**Find this line**:

```typescript
import { listActorStatesForSession, bulkUpsertActorStates } from '@minimal-rpg/db/node';
```

**Add these imports AFTER it**:

```typescript
import type {
  NpcTier,
  GameTime,
  DayPeriod,
  TieredSimulationConfig,
  NpcLocationState,
  LocationOccupancy,
  PresentNpc,
  CrowdLevel,
  TimeSkipSimulation,
} from '@minimal-rpg/schemas';
import { toSessionId } from '../utils/uuid.js';
import { asNpcState } from '../types/actor-state.js';
```

---

## Task 2: Delete Duplicate Helper Functions

**Problem**: Lines 694-740 contain DUPLICATE definitions of two functions that already exist at lines 644-689.

**Action**: Delete lines 691-741 (the entire second "Helper Functions" section).

**Find and DELETE this entire block** (starts around line 691):

```typescript
// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a narrative description of location occupancy.
 */
function generateOccupancyDescription(npcCount: number, crowdLevel: CrowdLevel): string {
  // ... duplicate function body ...
}

/**
 * Generate a summary of what happened during a time skip.
 */
function generateTimeSkipSummary(simulation: TimeSkipSimulation): string {
  // ... duplicate function body ...
}
```

**Keep the FIRST definitions** (around lines 644-689).

---

## Task 3: Fix SimulationContext Interface

**Location**: Around line 42-46

**Find this**:

```typescript
interface SimulationContext {
  lastComputedAt?: any;
  dayDecisions?: any;
  currentState?: NpcLocationState;
}
```

**Replace with**:

```typescript
interface SimulationContext {
  lastComputedAt?: GameTime;
  dayDecisions?: Record<string, unknown>;
  currentState?: NpcLocationState;
}
```

---

## Task 4: Fix onTurnComplete Function (lines 170-284)

### 4.1 Fix sessionId cast at line 190

**Find**:

```typescript
const actorStates = await listActorStatesForSession(sessionId as any);
```

**Replace with**:

```typescript
const actorStates = await listActorStatesForSession(toSessionId(sessionId));
```

### 4.2 Fix state access at line 200

**Find**:

```typescript
const stateObj = actorState.state as any;
```

**Replace with**:

```typescript
const stateObj = asNpcState(actorState.state);
```

### 4.3 Fix updates array at line 228

**Find**:

```typescript
const updates: any[] = [];
```

**Replace with**:

```typescript
const updates: Parameters<typeof bulkUpsertActorStates>[0] = [];
```

### 4.4 Fix state access at line 236

**Find**:

```typescript
const stateObj = actorState.state as any;
```

**Replace with**:

```typescript
const stateObj = asNpcState(actorState.state);
```

### 4.5 Fix sessionId cast at line 247

**Find**:

```typescript
sessionId: sessionId as any,
```

**Replace with**:

```typescript
sessionId: toSessionId(sessionId),
```

---

## Task 5: Fix onPeriodChange Function (lines 293-392)

### 5.1 Fix sessionId cast at line 312

**Find**:

```typescript
const actorStates = await listActorStatesForSession(sessionId as any);
```

**Replace with**:

```typescript
const actorStates = await listActorStatesForSession(toSessionId(sessionId));
```

### 5.2 Fix state access at line 322

**Find**:

```typescript
const stateObj = actorState.state as any;
```

**Replace with**:

```typescript
const stateObj = asNpcState(actorState.state);
```

### 5.3 Fix updates array at line 342

**Find**:

```typescript
const updates: any[] = [];
```

**Replace with**:

```typescript
const updates: Parameters<typeof bulkUpsertActorStates>[0] = [];
```

### 5.4 Fix state access at line 355

**Find**:

```typescript
const stateObj = actorState.state as any;
```

**Replace with**:

```typescript
const stateObj = asNpcState(actorState.state);
```

### 5.5 Fix sessionId cast at line 366

**Find**:

```typescript
sessionId: sessionId as any,
```

**Replace with**:

```typescript
sessionId: toSessionId(sessionId),
```

---

## Task 6: Fix onLocationChange Function (lines 401-517)

### 6.1 Fix sessionId cast at line 420

**Find**:

```typescript
const actorStates = await listActorStatesForSession(sessionId as any);
```

**Replace with**:

```typescript
const actorStates = await listActorStatesForSession(toSessionId(sessionId));
```

### 6.2 Fix state access at line 428

**Find**:

```typescript
const stateObj = actorState.state as any;
```

**Replace with**:

```typescript
const stateObj = asNpcState(actorState.state);
```

### 6.3 Fix updates array at line 443

**Find**:

```typescript
const updates: any[] = [];
```

**Replace with**:

```typescript
const updates: Parameters<typeof bulkUpsertActorStates>[0] = [];
```

### 6.4 Fix state access at line 454

**Find**:

```typescript
const stateObj = actorState.state as any;
```

**Replace with**:

```typescript
const stateObj = asNpcState(actorState.state);
```

### 6.5 Fix sessionId cast at line 465

**Find**:

```typescript
sessionId: sessionId as any,
```

**Replace with**:

```typescript
sessionId: toSessionId(sessionId),
```

---

## Task 7: Fix onTimeSkip Function (lines 526-638)

### 7.1 Fix sessionId cast at line 544

**Find**:

```typescript
const actorStates = await listActorStatesForSession(sessionId as any);
```

**Replace with**:

```typescript
const actorStates = await listActorStatesForSession(toSessionId(sessionId));
```

### 7.2 Fix state access at line 552

**Find**:

```typescript
const stateObj = actorState.state as any;
```

**Replace with**:

```typescript
const stateObj = asNpcState(actorState.state);
```

### 7.3 Fix updates array at line 566

**Find**:

```typescript
const updates: any[] = [];
```

**Replace with**:

```typescript
const updates: Parameters<typeof bulkUpsertActorStates>[0] = [];
```

### 7.4 Fix state access at line 578

**Find**:

```typescript
const stateObj = actorState.state as any;
```

**Replace with**:

```typescript
const stateObj = asNpcState(actorState.state);
```

### 7.5 Fix sessionId cast at line 589

**Find**:

```typescript
sessionId: sessionId as any,
```

**Replace with**:

```typescript
sessionId: toSessionId(sessionId),
```

---

## Task 8: Fix Remaining || to ?? Operators

Search for `||` in the file and replace with `??` where appropriate:

**Pattern to find**:

```typescript
stateObj.simulation || {}
```

**Replace with**:

```typescript
stateObj.simulation ?? {}
```

This pattern appears multiple times in the file (around lines 201, 240, 323, 359, 429, 458, 553, 582).

---

## Validation

After completing all tasks, run:

```bash
# Check this specific file for lint errors
npx eslint packages/api/src/services/simulation-hooks.ts --cache --cache-location .eslintcache

# Should output: no errors or warnings
```

**Expected result**: 0 errors, 0 warnings

---

## Summary of Changes

| Change | Count |
|--------|-------|
| Added type imports | 10 types |
| Deleted duplicate functions | ~50 lines |
| Replaced `sessionId as any` | 5 occurrences |
| Replaced `state as any` | 8 occurrences |
| Replaced `any[]` | 4 occurrences |
| Replaced `\|\|` with `??` | ~8 occurrences |
| Fixed interface types | 1 interface |

---

## Next Wave

After completing this wave and validating 0 errors, proceed to **Wave 3.4: Fix locations.ts**.
