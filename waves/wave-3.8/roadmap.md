# Wave 3.8: Fix Remaining API Lint Errors (350 Errors + 18 Warnings)

This wave fixes all remaining lint errors in `packages/api/src/` after completing Waves 3.1-3.7.

---

## Prerequisites

- **Waves 3.2-3.7 MUST be completed first** (creates foundation utilities)
- UUID utilities available at `src/utils/uuid.ts`

## Target Files (25 files, 368 total issues)

| Priority | File | Errors | Warnings |
|----------|------|--------|----------|
| High | `routes/users/profiles.ts` | 36 | 0 |
| High | `game/tools/handlers.ts` | 35 | 0 |
| High | `routes/game/hygiene.ts` | 20 | 10 |
| High | `routes/users/personas.ts` | 30 | 0 |
| Medium | `routes/game/sessions/session-messages.ts` | 27 | 0 |
| Medium | `routes/game/sessions/session-npcs.ts` | 27 | 0 |
| Medium | `routes/users/workspaceDrafts.ts` | 26 | 0 |
| Medium | `services/instances.ts` | 26 | 0 |
| Medium | `routes/resources/items.ts` | 22 | 0 |
| Medium | `routes/game/sessions/session-crud.ts` | 18 | 0 |
| Low | `routes/admin/sessions.ts` | 17 | 0 |
| Low | `routes/resources/tags.ts` | 17 | 0 |
| Low | `routes/studio.ts` | 13 | 0 |
| Low | Other small files | 36 | 8 |

---

## Phase 1: High-Impact Files

### Task 1.1: Fix `routes/users/profiles.ts` (36 errors)

**Error types**: `id as any`, `profileJson as any`

#### 1.1.1 Add UUID import

**Location**: Top of file, after existing imports (around line 19)

**Find**:

```typescript
import { getOwnerEmail } from '../../auth/ownerEmail.js';
```

**Add after**:

```typescript
import { toId } from '../../utils/uuid.js';
```

#### 1.1.2 Fix profileJson access pattern (lines 44-52)

**Find**:

```typescript
for (const t of dbRows) {
  try {
    const profile = t.profileJson as any;
    const parsed = CharacterProfileSchema.parse(profile);
    dbProfiles.push(parsed);
```

**Replace with**:

```typescript
for (const t of dbRows) {
  try {
    const parsed = CharacterProfileSchema.parse(t.profileJson);
    dbProfiles.push(parsed);
```

#### 1.1.3 Fix getEntityProfile calls (multiple locations)

**Find all occurrences of**:

```typescript
getEntityProfile(id as any)
```

**Replace with**:

```typescript
getEntityProfile(toId(id))
```

**Locations**: Lines ~70, ~108, ~157, ~166, ~211, ~246, ~253, ~277, ~286

#### 1.1.4 Fix getEntityProfile with profile.id

**Find all occurrences of**:

```typescript
getEntityProfile(profile.id as any)
```

**Replace with**:

```typescript
getEntityProfile(toId(profile.id))
```

**Locations**: Lines ~108, ~246

#### 1.1.5 Fix updateEntityProfile calls

**Find**:

```typescript
await updateEntityProfile(profile.id as any, {
  name: profile.name,
  profileJson: profile as any,
```

**Replace with**:

```typescript
await updateEntityProfile(toId(profile.id), {
  name: profile.name,
  profileJson: profile,
```

**Locations**: Lines ~115-118, ~253-255

#### 1.1.6 Fix createEntityProfile profileJson

**Find**:

```typescript
profileJson: profile as any,
```

**Replace with**:

```typescript
profileJson: profile,
```

**Locations**: Lines ~128, ~265

#### 1.1.7 Fix deleteEntityProfile calls

**Find**:

```typescript
await deleteEntityProfile(id as any);
```

**Replace with**:

```typescript
await deleteEntityProfile(toId(id));
```

**Locations**: Lines ~166, ~286

#### 1.1.8 Fix dbChar/dbSet profileJson access

**Find**:

```typescript
const profile = dbChar.profileJson as any;
const parsed = CharacterProfileSchema.parse(profile);
```

**Replace with**:

```typescript
const parsed = CharacterProfileSchema.parse(dbChar.profileJson);
```

**Locations**: Lines ~73-74, ~214-215

---

### Task 1.2: Fix `game/tools/handlers.ts` (35 errors)

**Error types**: `sessionId as any`, `state as Record<string, any>`

#### 1.2.1 Add UUID import

**Location**: Top of file, after existing imports

**Find**:

```typescript
import { safeParseJson } from '@minimal-rpg/utils';
```

**Add after**:

```typescript
import { toSessionId } from '../../utils/uuid.js';
```

#### 1.2.2 Define ActorStatePayload interface

**Location**: After imports, before class definition

**Add**:

```typescript
interface ActorStatePayload {
  profile?: Record<string, unknown>;
  name?: string;
  status?: 'active' | 'inactive';
}
```

#### 1.2.3 Fix executeGetSessionPersona (lines 147-153)

**Find**:

```typescript
and(eq(actorStates.sessionId, this.sessionId as any), eq(actorStates.actorType, 'player'))
```

**Replace with**:

```typescript
and(eq(actorStates.sessionId, toSessionId(this.sessionId)), eq(actorStates.actorType, 'player'))
```

#### 1.2.4 Fix state typing in executeGetSessionPersona (line 163)

**Find**:

```typescript
const state = playerState.state as Record<string, any>;
```

**Replace with**:

```typescript
const state = playerState.state as ActorStatePayload;
```

#### 1.2.5 Fix executeQueryNpcList (lines 199-201)

**Find**:

```typescript
and(eq(actorStates.sessionId, this.sessionId as any), eq(actorStates.actorType, 'npc'))
```

**Replace with**:

```typescript
and(eq(actorStates.sessionId, toSessionId(this.sessionId)), eq(actorStates.actorType, 'npc'))
```

#### 1.2.6 Fix state typing in executeQueryNpcList (line 205)

**Find**:

```typescript
const state = instance.state as Record<string, any>;
```

**Replace with**:

```typescript
const state = instance.state as ActorStatePayload;
```

#### 1.2.7 Fix executeGetNpcTranscript sessionId (line 244)

**Find**:

```typescript
and(eq(events.sessionId, this.sessionId as any), eq(events.type, 'SPOKE'))
```

**Replace with**:

```typescript
and(eq(events.sessionId, toSessionId(this.sessionId)), eq(events.type, 'SPOKE'))
```

#### 1.2.8 Fix payload typing (line 250)

**Find**:

```typescript
const payload = row.payload as Record<string, any>;
```

**Replace with**:

```typescript
const payload = row.payload as { content?: string };
```

#### 1.2.9 Fix actor state lookup (lines 263-268)

**Find**:

```typescript
and(
  eq(actorStates.sessionId, this.sessionId as any),
  eq(actorStates.actorId, args.npc_id)
)
```

**Replace with**:

```typescript
and(
  eq(actorStates.sessionId, toSessionId(this.sessionId)),
  eq(actorStates.actorId, args.npc_id)
)
```

#### 1.2.10 Fix state typing at line 272

**Find**:

```typescript
const state = actorState.state as Record<string, any>;
```

**Replace with**:

```typescript
const state = actorState.state as ActorStatePayload;
```

---

### Task 1.3: Fix `routes/game/hygiene.ts` (20 errors, 10 warnings)

**Error types**: `sessionId as any`, `state as Record<string, any>`, `||` vs `??`, unused imports

#### 1.3.1 Add UUID import and remove unused imports

**Find**:

```typescript
import {
  getActorState,
  upsertActorState,
  drizzle,
  actorStates,
  eq,
  and,
} from '@minimal-rpg/db/node';
```

**Replace with**:

```typescript
import { getActorState, upsertActorState } from '@minimal-rpg/db/node';
import { toSessionId, toId } from '../../utils/uuid.js';
```

#### 1.3.2 Define state interface

**Location**: After imports

**Add**:

```typescript
interface HygieneActorState {
  hygiene?: Record<string, BodyPartHygieneState>;
  [key: string]: unknown;
}
```

#### 1.3.3 Fix getNpcHygieneState (lines 53, 59)

**Find**:

```typescript
const actorState = await getActorState(sessionId as any, npcId);
...
const state = actorState.state as Record<string, any>;
const hygiene = state.hygiene || {};
```

**Replace with**:

```typescript
const actorState = await getActorState(toSessionId(sessionId), npcId);
...
const state = actorState.state as HygieneActorState;
const hygiene = state.hygiene ?? {};
```

#### 1.3.4 Fix saveNpcHygieneState (lines 76, 88, 91)

**Find**:

```typescript
const actorState = await getActorState(sessionId as any, npcId);
...
await upsertActorState({
  sessionId: sessionId as any,
  actorType: actorState.actorType,
  actorId: npcId,
  entityProfileId: actorState.entityProfileId as any,
```

**Replace with**:

```typescript
const actorState = await getActorState(toSessionId(sessionId), npcId);
...
await upsertActorState({
  sessionId: toSessionId(sessionId),
  actorType: actorState.actorType,
  actorId: npcId,
  entityProfileId: actorState.entityProfileId ? toId(actorState.entityProfileId) : undefined,
```

#### 1.3.5 Fix level nullish coalescing (line 168)

**Find**:

```typescript
const currentLevel = (currentPart.level ?? 0) as HygieneLevel;
```

This is already correct - check if there are other `||` usages that need `??`.

#### 1.3.6 Fix BODY_REGIONS.includes (line 313)

**Find**:

```typescript
if (BODY_REGIONS.includes(part as any)) {
```

**Replace with**:

```typescript
if ((BODY_REGIONS as readonly string[]).includes(part)) {
```

---

### Task 1.4: Fix `routes/users/personas.ts` (30 errors)

**Error types**: `id as any`, `sessionId as any`, `state as Record<string, any>`

#### 1.4.1 Add UUID imports

**Location**: After existing imports

**Find**:

```typescript
import { getOwnerEmail } from '../../auth/ownerEmail.js';
```

**Add after**:

```typescript
import { toId, toSessionId } from '../../utils/uuid.js';
```

#### 1.4.2 Define state interface

**Add after imports**:

```typescript
interface PersonaActorState {
  profile?: PersonaProfile | Record<string, unknown>;
  status?: 'active' | 'inactive';
}
```

#### 1.4.3 Fix all getEntityProfile calls

**Find all**:

```typescript
getEntityProfile(id as any)
getEntityProfile(profile.id as any)
getEntityProfile(body.personaId as any)
```

**Replace with**:

```typescript
getEntityProfile(toId(id))
getEntityProfile(toId(profile.id))
getEntityProfile(toId(body.personaId))
```

**Locations**: Lines ~71, ~103, ~110, ~125, ~160, ~170, ~188, ~198, ~225

#### 1.4.4 Fix updateEntityProfile calls

**Find**:

```typescript
await updateEntityProfile(profile.id as any, {
await updateEntityProfile(id as any, {
```

**Replace with**:

```typescript
await updateEntityProfile(toId(profile.id), {
await updateEntityProfile(toId(id), {
```

#### 1.4.5 Fix createEntityProfile id

**Find**:

```typescript
await createEntityProfile({
  id: profile.id as any,
```

**Replace with**:

```typescript
await createEntityProfile({
  id: toId(profile.id),
```

#### 1.4.6 Fix deleteEntityProfile

**Find**:

```typescript
await deleteEntityProfile(id as any);
```

**Replace with**:

```typescript
await deleteEntityProfile(toId(id));
```

#### 1.4.7 Fix upsertActorState (lines 240-250)

**Find**:

```typescript
await upsertActorState({
  sessionId: sessionId as any,
  actorType: 'player',
  actorId: 'player',
  entityProfileId: persona.id as any,
```

**Replace with**:

```typescript
await upsertActorState({
  sessionId: toSessionId(sessionId),
  actorType: 'player',
  actorId: 'player',
  entityProfileId: toId(persona.id),
```

#### 1.4.8 Fix getActorState calls (lines 259, 286, 292)

**Find**:

```typescript
await getActorState(sessionId as any, 'player')
await deleteActorState(sessionId as any, 'player')
```

**Replace with**:

```typescript
await getActorState(toSessionId(sessionId), 'player')
await deleteActorState(toSessionId(sessionId), 'player')
```

#### 1.4.9 Fix state typing (line 266)

**Find**:

```typescript
const state = playerState.state as Record<string, any>;
```

**Replace with**:

```typescript
const state = playerState.state as PersonaActorState;
```

---

## Phase 2: Session Route Files

### Task 2.1: Fix `routes/game/sessions/session-messages.ts` (27 errors)

Apply same patterns:

- Add `import { toSessionId } from '../../../utils/uuid.js';`
- Replace `sessionId as any` with `toSessionId(sessionId)`
- Replace `state as Record<string, any>` with typed interface
- Replace `||` with `??` where appropriate

### Task 2.2: Fix `routes/game/sessions/session-npcs.ts` (27 errors)

Apply same patterns as above.

### Task 2.3: Fix `routes/game/sessions/session-crud.ts` (18 errors)

Apply same patterns as above.

### Task 2.4: Fix `routes/game/sessions/session-overrides.ts` (6 errors)

Apply same patterns as above.

---

## Phase 3: Remaining Files

### Task 3.1: Fix `routes/users/workspaceDrafts.ts` (26 errors)

- Add UUID imports
- Replace `id as any` with `toId(id)`
- Replace `draftJson as any` with proper parsing

### Task 3.2: Fix `services/instances.ts` (26 errors)

- Add UUID imports
- Define state interfaces
- Replace `as any` with proper types

### Task 3.3: Fix `routes/resources/items.ts` (22 errors)

- Add UUID imports
- Replace `id as any` with `toId(id)`

### Task 3.4: Fix `routes/admin/sessions.ts` (17 errors)

- Add UUID imports
- Replace `sessionId as any` with `toSessionId(sessionId)`

### Task 3.5: Fix `routes/resources/tags.ts` (17 errors)

- Add UUID imports
- Replace `id as any` with `toId(id)`

### Task 3.6: Fix `routes/studio.ts` (13 errors)

- Add UUID imports
- Replace `id as any` with `toId(id)`

### Task 3.7: Fix remaining small files

Apply same patterns to:

- `routes/system/usage.ts` (7 errors)
- `db/sessionsClient.ts` (6 errors)
- `mappers/session-mappers.ts` (4 errors)
- `routes/game/sessions/session-effective.ts` (4 errors)
- `routes/game/sessions/shared.ts` (4 errors)
- `services/encounter-service.ts` (3 warnings - object injection)
- `routes/game/sessions/list-sessions.ts` (2 errors)
- `server-impl.ts` (2 errors)
- `loaders/sensory-modifiers-loader.ts` (4 warnings)
- `auth/supabase.ts` (1 warning)
- `routes/game/turns.ts` (1 error)

---

## Validation

After completing all tasks, run:

```bash
# Check API package for lint errors
pnpm turbo run lint --filter @minimal-rpg/api

# Should output: no errors or warnings
```

**Expected result**: 0 errors, 0 warnings

---

## Summary of Changes

| Change Type | Estimated Count |
|-------------|-----------------|
| Added UUID imports | ~20 files |
| Added state interface definitions | ~8 interfaces |
| Replaced `id as any` → `toId(id)` | ~80 occurrences |
| Replaced `sessionId as any` → `toSessionId(sessionId)` | ~40 occurrences |
| Replaced `profileJson as any` → direct parse | ~20 occurrences |
| Replaced `state as Record<string, any>` → typed | ~25 occurrences |
| Replaced `\|\|` → `??` | ~20 occurrences |
| Removed unused imports/variables | ~20 occurrences |

---

## Final Validation

After completing Wave 3.8, run full validation:

```bash
# Lint check
pnpm turbo run lint --filter @minimal-rpg/api

# Type check
pnpm turbo run typecheck --filter @minimal-rpg/api

# Tests
pnpm turbo run test --filter @minimal-rpg/api
```

**Expected result**: All pass with 0 errors.

---

## Success Metrics

| Metric | Before Wave 3.8 | Target |
|--------|-----------------|--------|
| Lint errors | 350 | 0 |
| Lint warnings | 18 | 0 |
| `as any` casts | ~200 | 0 |
