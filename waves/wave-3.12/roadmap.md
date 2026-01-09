# Wave 3.12: API Lint & TypeScript Cleanup (96 Issues)

This wave addresses remaining lint errors (37) and TypeScript errors (59) in `packages/api/src/`.

---

## Prerequisites

- Wave 3.11 completed
- Workspace builds successfully

## Current State

| Category | Count |
|----------|-------|
| Lint errors | 33 |
| Lint warnings | 2 |
| TypeScript errors | 59 |
| **Total** | **94** |

---

## Lint Error Distribution by Rule

| Rule | Count | Fix Strategy |
|------|-------|--------------|
| `no-unused-vars` | 16 | Delete unused variables |
| `prefer-nullish-coalescing` | 8 | Replace `\|\|` with `??` |
| `no-unnecessary-type-assertion` | 6 | Remove `as` casts |
| `no-unsafe-call` | 1 | Add type assertion |
| `non-nullable-type-assertion-style` | 1 | Use `!` assertion |
| `prefer-optional-chain` | 1 | Use `?.` operator |

## TypeScript Error Distribution by Code

| Error Code | Count | Description |
|------------|-------|-------------|
| TS18048 | 13 | Possibly undefined value |
| TS2322 | 11 | Type not assignable |
| TS4111 | 10 | Index expression not narrowed |
| TS2379 | 8 | exactOptionalPropertyTypes mismatch |
| TS2345 | 7 | Argument type mismatch |
| TS2677 | 2 | Index access on possibly undefined |
| TS2554 | 2 | Wrong number of arguments |
| TS2353 | 2 | Unknown property |
| Other | 4 | Various |

---

## Phase 1: Auto-fixable Issues (9 issues)

Run ESLint auto-fix for simple issues:

```bash
pnpm exec eslint packages/api/src --ext .ts --fix
```

This will fix:
- 8 `prefer-nullish-coalescing` errors
- 1 warning

**Verify**: `pnpm exec eslint packages/api/src --ext .ts 2>&1 | grep -c error`

---

## Phase 2: Fix `db/sessionsClient.ts` (8 unused imports)

### Task 2.1: Remove unused entity profile imports

**Location**: Lines 18-22

These imports are re-exported but never used locally. Since they're re-exported on lines 54-63, the imports at lines 18-22 are duplicates.

**Fix**: Remove lines 18-25 (the duplicate import block).

**Verify**: `pnpm exec eslint packages/api/src/db/sessionsClient.ts 2>&1`

---

## Phase 3: Fix `routes/resources/locations.ts` (13 TS + 6 lint)

### Task 3.1: Remove unnecessary type assertions

**Location**: Lines 111-112, 129-130, 148-149

**Current**:

```typescript
nodes: (row.nodesJson as LocationNode[]) as LocationNode[],
connections: (row.connectionsJson as LocationConnection[]) as LocationConnection[],
```

**Fix**: Remove double assertions:

```typescript
nodes: row.nodesJson as LocationNode[],
connections: row.connectionsJson as LocationConnection[],
```

### Task 3.2: Fix exactOptionalPropertyTypes errors

**Location**: Lines 216, 251, 365

**Pattern**: Build object conditionally instead of including undefined:

```typescript
// Before:
const input = {
  ownerEmail,
  name,
  description: parsed.description,  // undefined causes error
};

// After:
const input: CreateLocationMapInput = {
  ownerEmail,
  name,
};
if (parsed.description !== undefined) input.description = parsed.description;
```

### Task 3.3: Fix undefined parameter errors

**Location**: Lines 227, 264, 308, 376

**Pattern**: Add guard before calling function:

```typescript
// Before:
const result = toLocationMap(row);

// After:
if (!row) return c.json({ ok: false, error: 'not found' }, 404);
const result = toLocationMap(row);
```

### Task 3.4: Fix null to string assignments

**Location**: Lines 300, 304

**Pattern**:

```typescript
// Before:
settingId: row.settingId,

// After:
settingId: row.settingId ?? '',
// OR if the field should be optional:
settingId: row.settingId ?? undefined,
```

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep locations.ts`

---

## Phase 4: Fix `routes/resources/tags.ts` (6 TS errors)

### Task 4.1: Fix exactOptionalPropertyTypes at lines 93, 139, 169

**Pattern**: Same as Phase 3.2 - build objects conditionally.

### Task 4.2: Fix undefined parameter at line 145

**Pattern**: Same as Phase 3.3 - add guard.

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep tags.ts`

---

## Phase 5: Fix `routes/game/schedules.ts` (11 TS errors)

### Task 5.1: Fix TS4111 index expression errors

**Location**: Multiple lines

**Pattern**: Use type assertion or access with proper narrowing:

```typescript
// Before (TS4111):
const value = someRecord[key];

// After:
const value = someRecord[key as keyof typeof someRecord];
// OR use a type guard
```

### Task 5.2: Fix other type mismatches

Review each error and apply appropriate fix based on error type.

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep schedules.ts`

---

## Phase 6: Fix `routes/game/sessions/session-crud.ts` (10 TS errors)

### Task 6.1: Fix type assignment errors

Similar patterns to previous phases - handle undefined, null, and type mismatches.

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep session-crud.ts`

---

## Phase 7: Fix `game/tools/handlers.ts` (11 TS errors)

### Task 7.1: Fix TS18048 possibly undefined errors

**Pattern**: Add null checks or use optional chaining:

```typescript
// Before:
result.data.field

// After:
result?.data?.field
```

### Task 7.2: Fix TS4111 index expression errors

Same pattern as Phase 5.1.

**Verify**: `pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep handlers.ts`

---

## Phase 8: Fix Remaining Lint Errors

### Task 8.1: Fix `routes/admin/sessions.ts` (2 errors)

**Line 44**: Add type assertion for unsafe call
**Line 51**: Use `!` assertion instead of `as`

### Task 8.2: Fix `routes/game/hygiene.ts` (2 errors)

**Lines 155, 356**: Delete unused `_ownerEmail`

### Task 8.3: Fix `routes/game/turns.ts` (1 error)

**Line 124**: Delete unused `npcSpeaker`

### Task 8.4: Fix `routes/studio.ts` (5 errors)

**Lines 27, 49**: Delete unused destructured variables

### Task 8.5: Fix `routes/system/usage.ts` (1 error)

**Line 8**: Remove unused `and` import

### Task 8.6: Fix `routes/resources/items.ts` (1 lint error)

**Line 149**: Use optional chaining `?.`

### Task 8.7: Fix `auth/supabase.ts` (1 warning)

**Line 15**: Review object injection warning - suppress if safe

---

## Phase 9: Fix Remaining TypeScript Errors

### Task 9.1: Fix `routes/resources/items.ts` (2 TS errors)

### Task 9.2: Fix `routes/game/sessions/session-messages.ts` (2 TS errors)

### Task 9.3: Fix `routes/users/personas.ts` (1 TS error)

### Task 9.4: Fix `routes/game/sessions/index.ts` (1 TS error)

### Task 9.5: Fix `routes/game/hygiene.ts` (1 TS error)

### Task 9.6: Fix `routes/admin/sessions.ts` (1 TS error)

---

## Validation

After completing all tasks:

```bash
# Lint check
pnpm exec eslint packages/api/src --ext .ts
# Expected: 0 errors, 0 warnings (or only intentional suppressions)

# TypeScript check
pnpm exec tsc --noEmit -p packages/api/tsconfig.json
# Expected: 0 errors

# Build check
pnpm build
# Expected: Success
```

---

## Summary of Fix Patterns

### Pattern 1: Delete Unused Variables

```typescript
// Delete unused variables entirely
const { used } = obj;
```

### Pattern 2: Nullish Coalescing

```typescript
// Before:
value || default

// After:
value ?? default
```

### Pattern 3: Optional Chaining

```typescript
// Before:
obj && obj.prop && obj.prop.method()

// After:
obj?.prop?.method()
```

### Pattern 4: exactOptionalPropertyTypes

```typescript
// Before (includes undefined):
const obj = { key: maybeUndefined };

// After (conditional assignment):
const obj: Type = {};
if (value !== undefined) obj.key = value;
```

### Pattern 5: Undefined Guards

```typescript
// Before:
processRow(maybeUndefinedRow);

// After:
if (!maybeUndefinedRow) return handleError();
processRow(maybeUndefinedRow);
```

### Pattern 6: Index Access Narrowing

```typescript
// Before (TS4111):
record[dynamicKey]

// After:
record[dynamicKey as keyof typeof record]
```

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Lint errors | 33 | 0 |
| Lint warnings | 2 | 0 |
| TS errors | 59 | 0 |
| Build status | PASS | PASS |
