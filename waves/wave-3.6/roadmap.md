# Wave 3.6: Fix tier-service.ts (42 Errors)

This wave fixes all lint errors in `packages/api/src/services/tier-service.ts`.

---

## Prerequisites

- **Wave 3.2 MUST be completed first** (creates foundation utilities)

## Target File

`packages/api/src/services/tier-service.ts` - 42 lint errors

## Error Categories in This File

| Error Type | Count | Fix |
|------------|-------|-----|
| `as any` for sessionId parameters | ~12 | Use `toSessionId()` helper |
| `as any` for state access | ~20 | Use `asNpcState()` helper |
| `\|\|` vs `??` | ~6 | Replace with nullish coalescing |
| Unused `_ownerEmail` parameters | ~4 | Keep as-is (for future use) |

---

## Task 1: Add New Imports

**Location**: Top of file, after existing imports (around line 27)

**Find this line**:

```typescript
import { getActorState, listActorStatesForSession, upsertActorState } from '@minimal-rpg/db/node';
```

**Add these imports AFTER it**:

```typescript
import { toSessionId } from '../utils/uuid.js';
import { asNpcState } from '../types/index.js';
```

---

## Task 2: Fix getInterestScore Function

**Location**: Around lines 37-49

### 2.1 Fix getActorState call (around line 42)

**Find**:

```typescript
const actorState = await getActorState(sessionId as any, npcId);
```

**Replace with**:

```typescript
const actorState = await getActorState(toSessionId(sessionId), npcId);
```

### 2.2 Fix state access (around lines 45-48)

**Find**:

```typescript
const state = actorState.state as any;
if (!state.interest) return null;

return state.interest as PlayerInterestScore;
```

**Replace with**:

```typescript
const state = asNpcState(actorState.state);
if (!state.interest) return null;

return state.interest;
```

---

## Task 3: Fix getAllInterestScores Function

**Location**: Around lines 54-71

### 3.1 Fix listActorStatesForSession call (around line 58)

**Find**:

```typescript
const states = await listActorStatesForSession(sessionId as any);
```

**Replace with**:

```typescript
const states = await listActorStatesForSession(toSessionId(sessionId));
```

### 3.2 Fix state access in loop (around lines 63-66)

**Find**:

```typescript
const state = s.state as any;
if (state.interest) {
  result.set(s.actorId, state.interest as PlayerInterestScore);
}
```

**Replace with**:

```typescript
const state = asNpcState(s.state);
if (state.interest) {
  result.set(s.actorId, state.interest);
}
```

---

## Task 4: Fix processTurnInterest Function

**Location**: Around lines 80-170

### 4.1 Fix listActorStatesForSession call (around line 95)

**Find**:

```typescript
const npcStates = (await listActorStatesForSession(sessionId as any)).filter(
```

**Replace with**:

```typescript
const npcStates = (await listActorStatesForSession(toSessionId(sessionId))).filter(
```

### 4.2 Fix state access (around line 106)

**Find**:

```typescript
const stateBlob = actorState.state as any;
```

**Replace with**:

```typescript
const stateBlob = asNpcState(actorState.state);
```

### 4.3 Fix tier access (around line 139)

**Find**:

```typescript
const currentTier = (stateBlob.tier || 'background') as NpcTierType;
```

**Replace with**:

```typescript
const currentTier = (stateBlob.tier ?? 'background') as NpcTierType;
```

### 4.4 Fix upsertActorState call (around lines 147-154)

**Find**:

```typescript
await upsertActorState({
  sessionId: sessionId as any,
  actorType: actorState.actorType,
  actorId: npcId,
  entityProfileId: actorState.entityProfileId as any,
  state: newState,
  lastEventSeq: actorState.lastEventSeq,
});
```

**Replace with**:

```typescript
await upsertActorState({
  sessionId: toSessionId(sessionId),
  actorType: actorState.actorType,
  actorId: npcId,
  entityProfileId: actorState.entityProfileId ?? undefined,
  state: newState,
  lastEventSeq: actorState.lastEventSeq,
});
```

---

## Task 5: Fix executePromotion Function

**Location**: Around lines 180-202

### 5.1 Fix getActorState call (around line 186)

**Find**:

```typescript
const actorState = await getActorState(sessionId as any, npcId);
```

**Replace with**:

```typescript
const actorState = await getActorState(toSessionId(sessionId), npcId);
```

### 5.2 Fix state access (around lines 189-191)

**Find**:

```typescript
const newState = {
  ...(actorState.state as any),
  tier: newTier,
};
```

**Replace with**:

```typescript
const newState = {
  ...asNpcState(actorState.state),
  tier: newTier,
};
```

### 5.3 Fix upsertActorState call (around lines 194-200)

**Find**:

```typescript
await upsertActorState({
  sessionId: sessionId as any,
  actorType: actorState.actorType,
  actorId: npcId,
  entityProfileId: actorState.entityProfileId as any,
  state: newState,
  lastEventSeq: actorState.lastEventSeq,
});
```

**Replace with**:

```typescript
await upsertActorState({
  sessionId: toSessionId(sessionId),
  actorType: actorState.actorType,
  actorId: npcId,
  entityProfileId: actorState.entityProfileId ?? undefined,
  state: newState,
  lastEventSeq: actorState.lastEventSeq,
});
```

---

## Task 6: Fix getNpcsReadyForPromotion Function

**Location**: Around lines 208-233

### 6.1 Fix listActorStatesForSession call (around line 215)

**Find**:

```typescript
const npcStates = (await listActorStatesForSession(sessionId as any)).filter(
```

**Replace with**:

```typescript
const npcStates = (await listActorStatesForSession(toSessionId(sessionId))).filter(
```

### 6.2 Fix state access in loop (around lines 220-222)

**Find**:

```typescript
const stateBlob = s.state as any;
const tier = (stateBlob.tier || 'background') as NpcTierType;
const score = stateBlob.interest as PlayerInterestScore;
```

**Replace with**:

```typescript
const stateBlob = asNpcState(s.state);
const tier = (stateBlob.tier ?? 'background') as NpcTierType;
const score = stateBlob.interest;
```

---

## Validation

After completing all tasks, run:

```bash
# Check this specific file for lint errors
npx eslint packages/api/src/services/tier-service.ts --cache --cache-location .eslintcache

# Should output: no errors or warnings
```

**Expected result**: 0 errors, 0 warnings

---

## Summary of Changes

| Change | Count |
|--------|-------|
| Added type imports | 2 imports |
| Replaced `sessionId as any` | 6 occurrences |
| Replaced `state as any` | 6 occurrences |
| Replaced `entityProfileId as any` | 2 occurrences |
| Replaced `\|\|` with `??` | 3 occurrences |
| Removed unnecessary `as PlayerInterestScore` casts | 2 occurrences |

---

## Next Wave

After completing this wave and validating 0 errors, proceed to **Wave 3.7: Fix session-create-full.ts**.
