# TASK-002: Add Cross-Package Relative Import Restriction

**Priority**: P0
**Status**: Completed
**Estimate**: 15 minutes
**Depends On**: TASK-001 (can be combined)
**Category**: ESLint Configuration

---

## Objective

Prevent relative imports that cross package boundaries like `../../packages/schemas/src/types`. All cross-package imports must use the `@minimal-rpg/*` namespace.

## File to Modify

`eslint.config.mjs`

## Implementation

Extend the `no-restricted-imports` rule patterns (append to TASK-001's configuration):

```javascript
'no-restricted-imports': ['error', {
  patterns: [
    // From TASK-001
    {
      group: ['@minimal-rpg/*/src/*', '@minimal-rpg/*/src/**'],
      message: 'Import from package root (@minimal-rpg/pkg), not /src/ internals.',
    },
    {
      group: ['@minimal-rpg/*/dist/*', '@minimal-rpg/*/dist/**'],
      message: 'Import from package root (@minimal-rpg/pkg), not /dist/ internals.',
    },
    // This task
    {
      group: ['../../packages/*', '../../packages/**'],
      message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
    },
    {
      group: ['../../../packages/*', '../../../packages/**'],
      message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
    },
    {
      group: ['../../../../packages/*', '../../../../packages/**'],
      message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
    },
  ],
}]
```

## Validation

```bash
# Search for existing violations first
grep -r "from ['\"]\.\..*packages/" packages/*/src --include="*.ts" --include="*.tsx"

# Run lint
pnpm lint
```

## Acceptance Criteria

- [x] Rule patterns added to `eslint.config.mjs`
- [x] `pnpm lint` runs without config errors
- [x] No relative cross-package imports exist (or they are documented for fix)

## Notes

- Relative imports within the same package are still allowed (e.g., `../utils/helpers`)
- This prevents accidental tight coupling between packages that bypasses the public API
