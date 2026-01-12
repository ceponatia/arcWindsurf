# API Package Lint Remediation Plan (Phase 3)

**Status**: Draft
**Created**: January 2026
**Target**: Reduce 112 issues to 0

---

## Executive Summary

After completing Waves 3.1-3.8, the `@minimal-rpg/api` package has been reduced from **714 errors** to **112 issues** (84% reduction). However, wave 3.8 introduced **secondary errors** that were not anticipated:

| Error Type | Count | Cause |
|------------|-------|-------|
| `no-unsafe-assignment` | 36 | DB return types not narrowed |
| `no-unsafe-member-access` | 21 | Accessing properties on union types |
| `no-unsafe-call` | 15 | Calling methods on union types |
| `no-unused-vars` | 14 | **NEW** - Imports orphaned by fixes |
| `prefer-nullish-coalescing` | 14 | `\|\|` vs `??` not addressed |
| `security/detect-object-injection` | 12 | Dynamic property access |

---

## 1. Root Cause Analysis: Why Fixes Created New Errors

### 1.1 Orphaned Imports (14 errors)

**Pattern**: Wave 3.8 removed `as any` casts or changed code patterns, but left behind imports that were only used with those patterns.

**Example**:

```typescript
// Before wave 3.8:
import { getEntityProfile, safeParseJson } from '@minimal-rpg/db/node';
const data = await getEntityProfile(id as any);
const parsed = safeParseJson(data as any);

// After wave 3.8 (problematic):
import { getEntityProfile, safeParseJson } from '@minimal-rpg/db/node'; // ← unused!
const data = await getProfile(toId(id));  // Different function used
const parsed = SomeSchema.parse(data);    // Zod instead of safeParseJson
```

**Files affected**:

- `game/tools/handlers.ts` - `getEntityProfile`, `safeParseJson` unused
- `routes/game/hygiene.ts` - `and` unused after refactoring
- `routes/game/sessions/session-npcs.ts` - `tryParseName` unused
- `routes/game/sessions/session-messages.ts` - `npcSpeaker` unused
- `mappers/session-mappers.ts` - destructured variables unused
- `routes/game/sessions/session-crud.ts` - `CreateSessionResponse` unused

### 1.2 DB Return Type Narrowing (72 errors)

**Pattern**: DB functions like `listWorkspaceDrafts()`, `getSessionHistoryAdmin()` return types that TypeScript infers as potentially containing error states. Removing `as any` exposed these.

**Example**:

```typescript
// The DB function returns: Draft[] | Error (inferred from Drizzle)
const drafts = await listWorkspaceDrafts(userId);

// Without narrowing, this triggers:
// - no-unsafe-assignment: drafts might be Error
// - no-unsafe-member-access: drafts.length might fail
// - no-unsafe-call: drafts.map() might fail
return c.json({ drafts, total: drafts.length });
```

**Solution**: Add proper type narrowing or use typed wrappers.

---

## 2. Prevention Strategies for Future Waves

### 2.1 Atomic Lint Verification

**Rule**: After EVERY file edit, verify lint passes for that file before moving on.

```bash
# Run after each file change:
pnpm exec eslint <file-path> --cache
```

### 2.2 Import Cleanup Checklist

When removing or changing code patterns, always check:

- [ ] Are any imports now unused?
- [ ] Are any variables now unused?
- [ ] Are any type imports now unused?

### 2.3 DB Function Return Type Patterns

When calling DB functions, use one of these patterns:

Pattern A - Type assertion with validation:

```typescript
const drafts = await listWorkspaceDrafts(userId);
if (!Array.isArray(drafts)) {
  return c.json({ ok: false, error: 'DB error' }, 500);
}
// Now TypeScript knows drafts is an array
```

Pattern B - Wrapper function with typed return:

```typescript
async function listDraftsSafe(userId: string): Promise<Draft[]> {
  const result = await listWorkspaceDrafts(userId);
  if (!Array.isArray(result)) throw new Error('Unexpected result');
  return result;
}
```

Pattern C - Type-only assertion (when confident):

```typescript
const drafts = await listWorkspaceDrafts(userId) as Draft[];
```

### 2.4 Incremental Validation Workflow

```text
1. Make edit to file
2. Run: pnpm exec eslint <file> --cache
3. If new errors introduced:
   a. Fix unused imports/variables
   b. Add type narrowing if needed
   c. Re-run lint
4. Only proceed to next file when current file passes
```

---

## 3. Remaining Files to Fix

| File | Errors | Warnings | Primary Issue |
|------|--------|----------|---------------|
| `routes/users/workspaceDrafts.ts` | 26 | 0 | DB return types |
| `routes/admin/sessions.ts` | 17 | 0 | DB return types |
| `game/tools/handlers.ts` | 11 | 0 | Unused imports |
| `routes/game/hygiene.ts` | 2 | 6 | Unused + nullish |
| `services/instances.ts` | 7 | 0 | DB return types |
| `db/sessionsClient.ts` | 6 | 0 | DB return types |
| `routes/studio.ts` | 5 | 0 | Mixed |
| Others (13 files) | 38 | 6 | Various |

---

## 4. Fix Categories

### 4.1 Remove Unused Imports/Variables (14 fixes)

Simple deletions - just remove the unused items.

### 4.2 DB Return Type Narrowing (72 fixes)

Add type guards or assertions after DB calls.

### 4.3 Nullish Coalescing (14 fixes)

Replace `||` with `??` for nullable values.

### 4.4 Object Injection Warnings (12 fixes)

Either:

- Refactor to avoid dynamic property access
- Add eslint-disable with justification comment

---

## 5. Related Documents

- [API Lint Remediation Plan (Phase 1)](./api-lint-remediation-plan.md)
- [API Lint Remediation Plan (Phase 2)](./api-lint-remediation-plan-2.md)
- [Wave 3.9 Roadmap](../../waves/wave-3.9/roadmap.md)
