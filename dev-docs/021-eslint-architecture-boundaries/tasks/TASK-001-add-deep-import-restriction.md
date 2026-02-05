# TASK-001: Add Deep Import Restriction Rule

**Priority**: P0
**Status**: Completed
**Estimate**: 15 minutes
**Blocks**: None
**Category**: ESLint Configuration

---

## Objective

Prevent importing from package internals like `@minimal-rpg/schemas/src/internal` or `@minimal-rpg/utils/dist/helpers`. All imports should use the public API (package root or explicit subpath exports).

## File to Modify

`eslint.config.mjs`

## Implementation

Add `no-restricted-imports` rule to the source files configuration block:

```javascript
// In the rules section of the source files config
rules: {
  // Existing rules...

  'no-restricted-imports': ['error', {
    patterns: [
      {
        group: ['@minimal-rpg/*/src/*', '@minimal-rpg/*/src/**'],
        message: 'Import from package root (@minimal-rpg/pkg) or explicit subpath exports, not /src/ internals.',
      },
      {
        group: ['@minimal-rpg/*/dist/*', '@minimal-rpg/*/dist/**'],
        message: 'Import from package root (@minimal-rpg/pkg) or explicit subpath exports, not /dist/ internals.',
      },
    ],
  }],
}
```

## Validation

```bash
# Run lint to check for violations
pnpm lint

# Expected: Either passes clean, or reports specific files needing fixes
```

## Acceptance Criteria

- [x] Rule added to `eslint.config.mjs`
- [x] `pnpm lint` runs without config errors
- [x] Any existing violations are identified (list them in PR)
- [x] Rule blocks new deep imports going forward

## Notes

- If violations are found, fix them as part of this task or document them for follow-up
- Some packages may need to add explicit subpath exports in their `package.json` if they have legitimate deep import use cases
