# Wave 3.11: Fix API TypeScript Build Errors (79 Errors)

This wave fixes remaining TypeScript compilation errors in `packages/api/src/` that prevent the build from succeeding.

---

## Prerequisites

- Waves 3.2-3.10 completed
- DB package built successfully

## Current State

| Metric | Count |
|--------|-------|
| Total TS errors | 79 |
| Files affected | 12 |

---

## Error Distribution by File

| File | Errors | Primary Issue |
|------|--------|---------------|
| `routes/resources/locations.ts` | 14 | Row type mismatches |
| `routes/game/schedules.ts` | 10 | Type mismatches |
| `routes/game/sessions/session-crud.ts` | 10 | Function signatures |
| `game/tools/handlers.ts` | 10 | Type mismatches |
| `db/sessionsClient.ts` | 9 | Missing DB exports |
| `routes/resources/items.ts` | 8 | Type mismatches |
| `routes/resources/tags.ts` | 7 | Function signatures |
| `routes/game/sessions/session-messages.ts` | 2 | Type issues |
| `routes/users/personas.ts` | 2 | Function signatures |
| `routes/game/hygiene.ts` | 1 | Type issue |
| `routes/admin/sessions.ts` | 1 | Missing import |
| `routes/game/sessions/index.ts` | 1 | Type issue |

---

## Phase 1: Fix Missing DB Exports in `sessionsClient.ts` (9 errors)

The API is importing functions that don't exist in `@minimal-rpg/db/node`.

### Task 1.1: Remove or replace missing state slice functions

**Location**: Lines 7-9

**Current (broken)**:

```typescript
getLocationState as rawGetLocationState,
getInventoryState as rawGetInventoryState,
getTimeState as rawGetTimeState,
```

**Fix**: These functions don't exist. The state is stored in `sessionProjections`. Either:

Option A - Remove imports and exports (if unused):

```typescript
// Remove lines 7-9 and corresponding exports at lines 33-35
```

Option B - Create wrapper functions that query `sessionProjections`:

```typescript
// In @minimal-rpg/db/src/repositories/sessions.ts, add:
export async function getLocationState(sessionId: UUID) {
  const projection = await getSessionProjection(sessionId);
  return projection?.location;
}
// ... similar for inventory and time
```

### Task 1.2: Fix session location map function names

**Location**: Lines 22-24

**Current**:

```typescript
getSessionLocationMap as rawGetSessionLocationMap,
createSessionLocationMap as rawCreateSessionLocationMap,
deleteSessionLocationMap as rawDeleteSessionLocationMap,
```

**Fix**: Use the existing `getLocationMap`, `createLocationMap`, `deleteLocationMap` functions instead, or remove if unused.

### Task 1.3: Fix actor state function names

**Location**: Lines 76-77

**Current**:

```typescript
listActorStates,
saveActorState,
```

**Fix**: Use correct names:

```typescript
listActorStatesForSession,  // instead of listActorStates
upsertActorState,           // instead of saveActorState
```

### Task 1.4: Fix user functions

**Location**: Lines 78-79

**Current**:

```typescript
getOwnerEmail,
ensureUserAccount,
```

**Fix**: Either create these in DB or use alternatives:

- `getOwnerEmail` - may need to be created or removed
- `ensureUserAccount` - may need to be created or removed

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep sessionsClient`

---

## Phase 2: Fix `routes/admin/sessions.ts` (1 error)

### Task 2.1: Fix missing import

**Location**: Line 2

**Error**: Missing export `getSessionHistoryAdmin`

**Fix**: Check if this function exists in DB. If not, create it or use alternative.

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep admin/sessions`

---

## Phase 3: Fix `game/tools/handlers.ts` (10 errors)

### Task 3.1: Fix Drizzle query type issues

**Location**: Lines 48-55, 148, 204-205

These errors are related to Drizzle query results not matching expected types.

**Pattern to fix**:

```typescript
// Before (triggers type error):
const [playerState] = await drizzle
  .select()
  .from(actorStates)
  .where(...)
  .limit(1);

// After (with type assertion):
const results = await drizzle
  .select()
  .from(actorStates)
  .where(...)
  .limit(1);
const playerState = results[0] as ActorStateRow | undefined;
```

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep handlers.ts`

---

## Phase 4: Fix `routes/resources/locations.ts` (14 errors)

### Task 4.1: Fix Row type imports

Add proper type imports for DB row types:

```typescript
import type { LocationMapRow, LocationPrefabRow } from '@minimal-rpg/db';
```

### Task 4.2: Fix nullable field handling

Many errors are `string | null` not assignable to `string`.

**Pattern**:

```typescript
// Before:
description: row.description,

// After:
description: row.description ?? undefined,
```

### Task 4.3: Fix array type issues

**Location**: Lines 275-276

```typescript
// Before:
nodesJson: {},
connectionsJson: {},

// After:
nodesJson: [] as unknown[],
connectionsJson: [] as unknown[],
```

### Task 4.4: Fix mapper function types

**Location**: Lines 297, 312, 346

Add explicit type annotations to mapper callbacks:

```typescript
.map((row: LocationPrefabRow) => ({ ... }))
```

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep locations.ts`

---

## Phase 5: Fix `routes/resources/items.ts` (8 errors)

### Task 5.1: Fix type mismatches

Similar pattern to locations.ts:

- Add Row type imports
- Handle nullable fields with `?? undefined`
- Add explicit type annotations to mappers

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep items.ts`

---

## Phase 6: Fix `routes/resources/tags.ts` (7 errors)

### Task 6.1: Fix function signature mismatches

**Location**: Lines 169, 189

**Error**: Expected N arguments, but got M

Check the DB function signatures and update the API calls to match.

### Task 6.2: Fix `exactOptionalPropertyTypes` issues

**Location**: Lines 93, 139

**Pattern**:

```typescript
// Before (undefined included in object):
const options = { category: parsed.category };

// After (conditionally add properties):
const options: ListTagsOptions = {};
if (parsed.category) options.category = parsed.category;
```

### Task 6.3: Fix Row type issues

**Location**: Lines 145, 244, 248

Add type assertions or handle undefined properly.

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep tags.ts`

---

## Phase 7: Fix `routes/game/schedules.ts` (10 errors)

### Task 7.1: Fix type issues at lines 179-184

These appear to be object property type mismatches.

**Pattern**: Add proper type annotations and handle nullable fields.

### Task 7.2: Fix issues at lines 422, 432, 508, 521, 552

Review each error and apply appropriate fix:

- Type assertions for DB results
- Nullable field handling
- Function signature alignment

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep schedules.ts`

---

## Phase 8: Fix `routes/game/sessions/session-crud.ts` (10 errors)

### Task 8.1: Fix type issues at lines 44, 120, 134-135, 145, 150-153

These are likely related to:

- Session creation/update input types
- exactOptionalPropertyTypes issues
- Return type handling

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep session-crud.ts`

---

## Phase 9: Fix Remaining Files

### Task 9.1: Fix `routes/game/sessions/session-messages.ts` (2 errors)

**Location**: Line 42

### Task 9.2: Fix `routes/users/personas.ts` (2 errors)

**Location**: Lines 70, 145

**Error at line 70**: Expected 1 argument, got 2 - fix function call signature

**Error at line 145**: Unknown property 'id' - remove or rename property

### Task 9.3: Fix `routes/game/hygiene.ts` (1 error)

**Location**: Line 139

### Task 9.4: Fix `routes/game/sessions/index.ts` (1 error)

**Location**: Line 21

---

## Validation

After completing all tasks:

```bash
# TypeScript check
pnpm exec tsc --noEmit -p packages/api/tsconfig.json

# Build check
pnpm turbo run build --filter @minimal-rpg/api

# Expected: 0 errors
```

---

## Summary of Fix Patterns

### Pattern 1: Missing DB Exports

Either add the function to DB or use an existing alternative.

### Pattern 2: Row Type Mismatches

```typescript
import type { SomeRow } from '@minimal-rpg/db';

// Add type assertion after DB query
const result = await dbFunction(...) as SomeRow | undefined;
```

### Pattern 3: Nullable Field Handling

```typescript
// Convert null to undefined for optional fields
field: row.field ?? undefined,
```

### Pattern 4: exactOptionalPropertyTypes

```typescript
// Build object conditionally instead of including undefined
const obj: SomeType = {};
if (value !== undefined) obj.key = value;
```

### Pattern 5: Function Signature Mismatch

Check the DB function signature and update API call to match.

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| TS errors | 79 | 0 |
| Build status | FAIL | PASS |
