# TASK-006: Audit and Migrate Misplaced Schemas

**Priority**: P2
**Status**: ✅ Completed
**Estimate**: 1-2 hours
**Depends On**: TASK-005
**Category**: Code Migration

---

## Objective

Identify all exported Zod schemas defined outside `@minimal-rpg/schemas` and migrate them to the appropriate location.

## Findings

No exported Zod schemas were found outside `packages/schemas`.

## Prerequisites

TASK-005 must be complete so the lint rule identifies violations.

## Step 1: Run Audit

```bash
# Option A: Use lint output
pnpm lint 2>&1 | grep "schemas-only-in-schemas-package"

# Option B: Manual search
grep -r "export.*Schema.*=.*z\." packages/*/src --include="*.ts" | grep -v "packages/schemas/"
```

## Step 2: Categorize Violations

For each found schema, categorize:

### Category A: Move to schemas

Schema is reused across packages or represents domain data.

**Action:** Move to `@minimal-rpg/schemas`, update imports.

### Category B: Keep as local (non-exported)

Schema is only used for internal validation in one place.

**Action:** Remove `export` keyword, keep local.

### Category C: Convert to type import

Schema duplicates something already in schemas.

**Action:** Delete, import from `@minimal-rpg/schemas`.

## Step 3: Migration Template

For each schema being moved:

1. Create/find appropriate file in `packages/schemas/src/`
2. Move schema definition
3. Export from `packages/schemas/src/index.ts`
4. Update all imports across packages
5. Run `pnpm typecheck` to verify
6. Run `pnpm lint` to verify

### Example Migration

**Before** (in `packages/api/src/routes/validators.ts`):

```typescript
export const CreateItemSchema = z.object({
  name: z.string(),
  category: z.string(),
});
```

**After** (in `packages/schemas/src/items/create-item.ts`):

```typescript
export const CreateItemSchema = z.object({
  name: z.string(),
  category: z.string(),
});

export type CreateItem = z.infer<typeof CreateItemSchema>;
```

**Updated import** (in `packages/api/src/routes/items.ts`):

```typescript
import { CreateItemSchema } from '@minimal-rpg/schemas';
```

## Validation

```bash
# After all migrations
pnpm lint  # Should have no schema-containment warnings
pnpm typecheck  # Should pass
pnpm test  # Should pass
```

## Acceptance Criteria

- [x] All exported schemas outside schemas package identified
- [x] Each schema categorized (move / localize / delete)
- [x] Schemas migrated to `@minimal-rpg/schemas` as appropriate
- [x] All imports updated across packages
- [x] `pnpm lint` passes with no schema-containment warnings
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes

## Deliverables

1. List of schemas found and their disposition
2. PR with all migrations
3. Updated `@minimal-rpg/schemas` exports

## Notes

- If migration scope is large, split into multiple PRs by domain (items, characters, etc.)
- Prefer creating subdirectories in schemas for organization
- Consider adding JSDoc to migrated schemas for discoverability
