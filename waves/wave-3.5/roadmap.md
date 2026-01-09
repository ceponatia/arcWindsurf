# Wave 3.5: Fix schedules.ts (61 Errors)

This wave fixes all lint errors in `packages/api/src/routes/game/schedules.ts`.

---

## Prerequisites

- **Wave 3.2 MUST be completed first** (creates foundation utilities)

## Target File

`packages/api/src/routes/game/schedules.ts` - 61 lint errors

## Error Categories in This File

| Error Type | Count | Fix |
|------------|-------|-----|
| `as any` for sessionId/id parameters | ~25 | Use `toSessionId()` / `toId()` helpers |
| `as any` for state access | ~20 | Use `asNpcState()` helper |
| `as any` for scheduleJson | ~10 | Use proper typing |
| `\|\|` vs `??` | ~6 | Replace with nullish coalescing |

---

## Task 1: Add New Imports

**Location**: Top of file, after existing imports (around line 14)

**Find this line**:

```typescript
import { getOwnerEmail } from '../../auth/ownerEmail.js';
```

**Add these imports AFTER it**:

```typescript
import { toSessionId, toId } from '../../utils/uuid.js';
import { asNpcState, type NpcActorState } from '../../types/index.js';
```

---

## Task 2: Fix GET /schedule-templates/:id Route

**Location**: Around line 91-123

**Find this line** (around line 98):

```typescript
.where(eq(scheduleTemplates.id, id as any))
```

**Replace with**:

```typescript
.where(eq(scheduleTemplates.id, toId(id)))
```

---

## Task 3: Fix POST /schedule-templates Route

**Location**: Around line 129-195

**Find this line** (around line 170):

```typescript
scheduleJson: templateData as any,
```

**Replace with**:

```typescript
scheduleJson: templateData,
```

---

## Task 4: Fix PUT /schedule-templates/:id Route

**Location**: Around line 201-274

### 4.1 Fix scheduleJson cast (around line 246)

**Find**:

```typescript
scheduleJson: (templateData as any) || undefined,
```

**Replace with**:

```typescript
scheduleJson: templateData ?? undefined,
```

### 4.2 Fix where clause (around line 249)

**Find**:

```typescript
.where(eq(scheduleTemplates.id, id as any))
```

**Replace with**:

```typescript
.where(eq(scheduleTemplates.id, toId(id)))
```

---

## Task 5: Fix DELETE /schedule-templates/:id Route

**Location**: Around line 280-293

**Find this line** (around line 284):

```typescript
await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, id as any));
```

**Replace with**:

```typescript
await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, toId(id)));
```

---

## Task 6: Fix GET /sessions/:sessionId/npc-schedules Route

**Location**: Around line 303-332

### 6.1 Fix where clause (around line 310)

**Find**:

```typescript
.where(and(eq(actorStates.sessionId, sessionId as any), eq(actorStates.actorType, 'npc')));
```

**Replace with**:

```typescript
.where(and(eq(actorStates.sessionId, toSessionId(sessionId)), eq(actorStates.actorType, 'npc')));
```

### 6.2 Fix filter and map callbacks (around lines 313-321)

**Find**:

```typescript
const schedules = npcStates
  .filter((s) => (s.state as any).schedule)
  .map((s) => {
    const state = s.state as any;
    return {
      npcId: s.actorId,
      scheduleData: state.schedule.scheduleData,
      templateId: state.schedule.templateId,
      placeholderMappings: state.schedule.placeholderMappings,
    };
  });
```

**Replace with**:

```typescript
const schedules = npcStates
  .filter((s) => {
    const state = asNpcState(s.state);
    return state.schedule !== undefined;
  })
  .map((s) => {
    const state = asNpcState(s.state);
    return {
      npcId: s.actorId,
      scheduleData: state.schedule?.scheduleData,
      templateId: state.schedule?.templateId,
      placeholderMappings: state.schedule?.placeholderMappings,
    };
  });
```

---

## Task 7: Fix GET /sessions/:sessionId/npc-schedules/:npcId Route

**Location**: Around line 338-361

### 7.1 Fix getActorState call (around line 342)

**Find**:

```typescript
const actorState = await getActorState(sessionId as any, npcId);
```

**Replace with**:

```typescript
const actorState = await getActorState(toSessionId(sessionId), npcId);
```

### 7.2 Fix state access (around lines 344-348)

**Find**:

```typescript
if (!actorState || !(actorState.state as any).schedule) {
  return c.json({ ok: false, error: 'NPC schedule not found' } satisfies ApiError, 404);
}

const schedule = (actorState.state as any).schedule;
```

**Replace with**:

```typescript
const state = actorState ? asNpcState(actorState.state) : null;
if (!state || !state.schedule) {
  return c.json({ ok: false, error: 'NPC schedule not found' } satisfies ApiError, 404);
}

const schedule = state.schedule;
```

---

## Task 8: Fix POST /sessions/:sessionId/npc-schedules Route

**Location**: Around line 367-444

### 8.1 Fix getActorState call (around line 405)

**Find**:

```typescript
const actorState = await getActorState(sessionId as any, npcId);
```

**Replace with**:

```typescript
const actorState = await getActorState(toSessionId(sessionId), npcId);
```

### 8.2 Fix upsertActorState call (around lines 419-426)

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

## Task 9: Fix PUT /sessions/:sessionId/npc-schedules/:npcId Route

**Location**: Around line 450-524

### 9.1 Fix getActorState call (around line 454)

**Find**:

```typescript
const actorState = await getActorState(sessionId as any, npcId);
```

**Replace with**:

```typescript
const actorState = await getActorState(toSessionId(sessionId), npcId);
```

### 9.2 Fix existingSchedule access (around line 495)

**Find**:

```typescript
const existingSchedule = (actorState.state as any).schedule || {};
```

**Replace with**:

```typescript
const existingSchedule = asNpcState(actorState.state).schedule ?? {};
```

### 9.3 Fix upsertActorState call (around lines 507-514)

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

## Task 10: Fix DELETE /sessions/:sessionId/npc-schedules/:npcId Route

**Location**: Around line 530-555

### 10.1 Fix getActorState call (around line 534)

**Find**:

```typescript
const actorState = await getActorState(sessionId as any, npcId);
```

**Replace with**:

```typescript
const actorState = await getActorState(toSessionId(sessionId), npcId);
```

### 10.2 Fix state destructuring (around line 539)

**Find**:

```typescript
const { schedule, ...remainingState } = actorState.state as any;
```

**Replace with**:

```typescript
const npcState = asNpcState(actorState.state);
const { schedule, ...remainingState } = npcState;
```

### 10.3 Fix upsertActorState call (around lines 541-548)

**Find**:

```typescript
await upsertActorState({
  sessionId: sessionId as any,
  actorType: actorState.actorType,
  actorId: npcId,
  entityProfileId: actorState.entityProfileId as any,
  state: remainingState,
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
  state: remainingState,
  lastEventSeq: actorState.lastEventSeq,
});
```

---

## Validation

After completing all tasks, run:

```bash
# Check this specific file for lint errors
npx eslint packages/api/src/routes/game/schedules.ts --cache --cache-location .eslintcache

# Should output: no errors or warnings
```

**Expected result**: 0 errors, 0 warnings

---

## Summary of Changes

| Change | Count |
|--------|-------|
| Added type imports | 4 imports |
| Replaced `sessionId as any` | 6 occurrences |
| Replaced `id as any` | 4 occurrences |
| Replaced `state as any` | 6 occurrences |
| Replaced `entityProfileId as any` | 4 occurrences |
| Replaced `\|\|` with `??` | 3 occurrences |
| Fixed filter/map callbacks | 1 block |

---

## Next Wave

After completing this wave and validating 0 errors, proceed to **Wave 3.6: Fix tier-service.ts**.
