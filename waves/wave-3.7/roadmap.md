# Wave 3.7: Fix session-create-full.ts (38 Errors)

This wave fixes all lint errors in `packages/api/src/routes/game/sessions/session-create-full.ts`.

---

## Prerequisites

- **Wave 3.2 MUST be completed first** (creates foundation utilities)

## Target File

`packages/api/src/routes/game/sessions/session-create-full.ts` - 38 lint errors

## Error Categories in This File

| Error Type | Count | Fix |
|------------|-------|-----|
| `as any` for ID parameters | ~25 | Use `toSessionId()` / `toId()` / `toIds()` helpers |
| `as any` for state/profile access | ~8 | Use proper typing |
| `personaProfile: any` variable | 1 | Type properly |
| `as any` for JSON inserts | ~4 | Remove unnecessary casts |

---

## Task 1: Add New Imports

**Location**: Top of file, after existing imports (around line 23)

**Find this line**:

```typescript
import { getAuthUser } from '../../../auth/middleware.js';
```

**Add these imports AFTER it**:

```typescript
import { toSessionId, toId, toIds } from '../../../utils/uuid.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';
```

---

## Task 2: Fix personaProfile Variable Type

**Location**: Around line 198

**Find**:

```typescript
let personaProfile: any = null;
```

**Replace with**:

```typescript
let personaProfile: CharacterProfile | Record<string, unknown> | null = null;
```

---

## Task 3: Fix Persona Lookup

**Location**: Around lines 199-210

### 3.1 Fix inArray call (around line 203)

**Find**:

```typescript
.where(inArray(actorStates.actorId, [request.personaId]))
```

**Replace with**:

```typescript
.where(inArray(actorStates.actorId, [request.personaId] as string[]))
```

### 3.2 Fix profile access (around line 209)

**Find**:

```typescript
personaProfile = (personaResult[0].state as any).profile || personaResult[0].state;
```

**Replace with**:

```typescript
const personaState = personaResult[0].state as Record<string, unknown>;
personaProfile = (personaState.profile as CharacterProfile | Record<string, unknown>) ?? personaState;
```

---

## Task 4: Fix Tag Validation

**Location**: Around lines 213-224

**Find this line** (around line 218):

```typescript
.where(inArray(promptTags.id, tagIds as any));
```

**Replace with**:

```typescript
.where(inArray(promptTags.id, toIds(tagIds)));
```

---

## Task 5: Fix Session Insert

**Location**: Around lines 265-272

**Find**:

```typescript
await tx.insert(sessions).values({
  id: sessionId as any,
  ownerEmail,
  name: `Session ${sessionId.substring(0, 8)}`,
  playerCharacterId: (primaryNpc?.characterId || '') as any,
  settingId: request.settingId as any,
  status: 'active',
});
```

**Replace with**:

```typescript
await tx.insert(sessions).values({
  id: toId(sessionId),
  ownerEmail,
  name: `Session ${sessionId.substring(0, 8)}`,
  playerCharacterId: toId(primaryNpc?.characterId ?? ''),
  settingId: toId(request.settingId),
  status: 'active',
});
```

---

## Task 6: Fix Session Projection Insert

**Location**: Around lines 275-293

**Find this line** (around line 276):

```typescript
sessionId: sessionId as any,
```

**Replace with**:

```typescript
sessionId: toSessionId(sessionId),
```

---

## Task 7: Fix NPC Actor State Inserts

**Location**: Around lines 326-344

**Find**:

```typescript
await tx.insert(actorStates).values({
  id: generateId() as any,
  sessionId: sessionId as any,
  actorType: 'npc',
  actorId: npc.id,
  entityProfileId: npc.characterId as any,
  state: {
```

**Replace with**:

```typescript
await tx.insert(actorStates).values({
  id: toId(generateId()),
  sessionId: toSessionId(sessionId),
  actorType: 'npc',
  actorId: npc.id,
  entityProfileId: toId(npc.characterId),
  state: {
```

---

## Task 8: Fix Player Actor State Insert

**Location**: Around lines 349-361

**Find**:

```typescript
await tx.insert(actorStates).values({
  id: generateId() as any,
  sessionId: sessionId as any,
  actorType: 'player',
  actorId: 'player',
  entityProfileId: request.personaId as any,
  state: {
```

**Replace with**:

```typescript
await tx.insert(actorStates).values({
  id: toId(generateId()),
  sessionId: toSessionId(sessionId),
  actorType: 'player',
  actorId: 'player',
  entityProfileId: request.personaId ? toId(request.personaId) : undefined,
  state: {
```

---

## Task 9: Fix Session Tag Inserts

**Location**: Around lines 399-404

**Find**:

```typescript
await tx.insert(sessionTags).values({
  id: bindingId as any,
  sessionId: sessionId as any,
  tagId: normalized.tagId as any,
  enabled: true,
});
```

**Replace with**:

```typescript
await tx.insert(sessionTags).values({
  id: toId(bindingId),
  sessionId: toSessionId(sessionId),
  tagId: toId(normalized.tagId),
  enabled: true,
});
```

---

## Validation

After completing all tasks, run:

```bash
# Check this specific file for lint errors
npx eslint packages/api/src/routes/game/sessions/session-create-full.ts --cache --cache-location .eslintcache

# Should output: no errors or warnings
```

**Expected result**: 0 errors, 0 warnings

---

## Summary of Changes

| Change | Count |
|--------|-------|
| Added type imports | 4 imports |
| Fixed `personaProfile` type | 1 variable |
| Replaced `id as any` | 8 occurrences |
| Replaced `sessionId as any` | 4 occurrences |
| Replaced `tagId as any` | 1 occurrence |
| Replaced `entityProfileId as any` | 2 occurrences |
| Replaced `\|\|` with `??` | 2 occurrences |
| Fixed state access patterns | 2 occurrences |

---

## Final Validation

After completing all waves (3.2-3.7), run a full lint check on the API package:

```bash
pnpm turbo run lint --filter @minimal-rpg/api
```

**Expected result**: All waves complete = significant error reduction from 714 to ~100 remaining (other files).

---

## Next Steps

After completing waves 3.2-3.7, the top 5 offending files will be fixed. Remaining errors will be in:

- `routes/users/profiles.ts` (36 errors)
- `game/tools/handlers.ts` (35 errors)
- `routes/users/personas.ts` (30 errors)
- Other smaller files

These can be addressed in subsequent waves using the same patterns established in waves 3.2-3.7.
