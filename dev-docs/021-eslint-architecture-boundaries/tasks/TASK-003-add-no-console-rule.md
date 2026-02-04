# TASK-003: Add No Console Rule

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 30 minutes
**Depends On**: None
**Category**: ESLint Configuration

---

## Objective

Discourage direct `console.log()` usage in favor of structured logging. Allow `console.warn()` and `console.error()` as escape hatches until a proper logger is established.

## File to Modify

`eslint.config.mjs`

## Implementation

Add the `no-console` rule:

```javascript
rules: {
  // Existing rules...

  // Discourage console.log - use structured logging
  'no-console': ['warn', {
    allow: ['warn', 'error', 'info', 'debug'],
  }],
}
```

### Severity Choice

- Use `'warn'` initially to identify usage without blocking builds
- Upgrade to `'error'` once a logger utility is available and adopted

## Validation

```bash
# Count existing console.log usage
grep -r "console\.log" packages/*/src --include="*.ts" --include="*.tsx" | wc -l

# Run lint
pnpm lint
```

## Acceptance Criteria

- [ ] Rule added to `eslint.config.mjs`
- [ ] `pnpm lint` runs and reports console.log as warnings
- [ ] Document count of existing violations in PR

## Follow-Up Tasks

If many violations exist, consider:

1. Creating a logger utility in `@minimal-rpg/utils`
2. Batch-replacing `console.log` with `logger.debug`
3. Upgrading rule to `'error'` severity

## Notes

- `console.warn` and `console.error` are allowed for legitimate error reporting
- `console.info` and `console.debug` allowed for gradual migration
- Test files are already excluded from linting, so test console usage is unaffected
