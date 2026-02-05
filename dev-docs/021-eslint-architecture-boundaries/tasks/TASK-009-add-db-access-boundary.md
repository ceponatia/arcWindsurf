# TASK-009: Add Database Access Boundary Rule

**Priority**: P2
**Status**: Completed
**Estimate**: 1 hour
**Depends On**: TASK-004 (layer boundaries rule provides foundation)
**Category**: Custom ESLint Rule

---

## Objective

Restrict direct `@minimal-rpg/db` imports to specific packages that should have database access. Other packages must go through services/retrieval layers.

## Allowed Packages

Only these packages may import from `@minimal-rpg/db`:

- `api` - API orchestration layer
- `retrieval` - Data retrieval services
- `services` - Business logic services
- `projections` - Read models / projections
- `web` - Frontend (for Drizzle types, not direct queries)

## Forbidden Packages

These should NOT import `@minimal-rpg/db` directly:

- `schemas` - Types only, no db access
- `utils` - Utilities, no db access
- `bus` - Event bus, no db access
- `llm` - LLM abstraction, no db access
- `generator` - Content generation, no db access
- `characters` - Character logic, use services
- `actors` - State machines, use services
- `ui` - UI components, no db access

## Implementation

Add to `no-restricted-imports` in `eslint.config.mjs`, using file path overrides:

```javascript
// Packages NOT allowed to import @minimal-rpg/db
{
  files: [
    'packages/schemas/src/**/*.ts',
    'packages/utils/src/**/*.ts',
    'packages/bus/src/**/*.ts',
    'packages/llm/src/**/*.ts',
    'packages/generator/src/**/*.ts',
    'packages/characters/src/**/*.ts',
    'packages/actors/src/**/*.ts',
    'packages/ui/src/**/*.ts',
  ],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        {
          name: '@minimal-rpg/db',
          message: 'This package should not import @minimal-rpg/db directly. Use @minimal-rpg/services or @minimal-rpg/retrieval instead.',
        },
      ],
      patterns: [
        {
          group: ['@minimal-rpg/db/*', '@minimal-rpg/db/**'],
          message: 'This package should not import @minimal-rpg/db directly. Use services/retrieval layer.',
        },
      ],
    }],
  },
},
```

## Alternative: Custom Rule

If more flexibility needed, add to `config/eslint/rules/db-access-boundary.mjs`:

```javascript
const allowedPackages = ['api', 'retrieval', 'services', 'projections', 'web'];

function getPackageFromPath(filePath) {
  const match = filePath.match(/packages\/([^/]+)\//);
  return match ? match[1] : null;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Restrict @minimal-rpg/db imports to allowed packages',
    },
    messages: {
      dbAccessForbidden:
        "Package '{{pkg}}' cannot import @minimal-rpg/db directly. Use @minimal-rpg/services or @minimal-rpg/retrieval instead.",
    },
  },
  create(context) {
    const currentPackage = getPackageFromPath(context.filename);

    if (!currentPackage || allowedPackages.includes(currentPackage)) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        if (importPath === '@minimal-rpg/db' || importPath.startsWith('@minimal-rpg/db/')) {
          context.report({
            node: node.source,
            messageId: 'dbAccessForbidden',
            data: { pkg: currentPackage },
          });
        }
      },
    };
  },
};
```

## Validation

```bash
# Find existing db imports in forbidden packages
for pkg in schemas utils bus llm generator characters actors ui; do
  echo "=== $pkg ==="
  grep -r "@minimal-rpg/db" packages/$pkg/src --include="*.ts" || echo "Clean"
done

# Run lint
pnpm lint
```

## Acceptance Criteria

- [x] Rule configured (via no-restricted-imports or custom rule)
- [x] Allowed packages can still import `@minimal-rpg/db`
- [x] Forbidden packages receive error when importing `@minimal-rpg/db`
- [x] `pnpm lint` runs without config errors
- [x] Existing violations documented (if any)

## Existing Violations

No actual `import` statements from `@minimal-rpg/db` exist in any forbidden package. Verified clean for: schemas, utils, bus, llm, generator, characters, actors, ui.

Allowed packages with active db imports (all legitimate): api, projections, services, workers.

## Validation Results

- Tested forbidden import in `packages/characters/src/` - correctly reported `no-restricted-imports` error.
- Tested allowed import in `packages/api/src/` - no restriction error (only `no-unused-vars` for the test stub).

## Notes

- Type-only imports (`import type { ... } from '@minimal-rpg/db'`) may be acceptable for some packages
- If type-only imports need to be allowed, use TypeScript's `verbatimModuleSyntax` or check import kind in custom rule
- `web` package allowed for Drizzle schema types but should not run queries directly (queries go through API)
