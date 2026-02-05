# TASK-007: Add Dependency Cruiser for Graph Analysis

**Priority**: P2
**Status**: ✅ Completed
**Estimate**: 1 hour
**Depends On**: None
**Category**: Tooling

---

## Objective

Integrate dependency-cruiser to detect circular dependencies and visualize the package dependency graph.

## Files to Create/Modify

1. `.dependency-cruiser.cjs` - Configuration
2. `package.json` - Add script and devDep
3. `.github/workflows/ci.yml` - Add CI check (optional)

## Step 1: Install Dependency

```bash
pnpm add -D dependency-cruiser -w
```

## Step 2: Create Configuration

Create `.dependency-cruiser.cjs` in repo root:

```javascript
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies cause build issues and indicate tight coupling',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'schemas-no-internal-deps',
      severity: 'error',
      comment: 'schemas package must not depend on other internal packages',
      from: {
        path: '^packages/schemas/',
      },
      to: {
        path: '^packages/(?!schemas/)',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'utils-only-schemas',
      severity: 'warn',
      comment: 'utils should only depend on schemas',
      from: {
        path: '^packages/utils/',
      },
      to: {
        path: '^packages/(?!schemas|utils)/',
        pathNot: 'node_modules',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
      },
    },
  },
};
```

## Step 3: Add npm Scripts

In root `package.json`:

```json
{
  "scripts": {
    "deps:check": "dependency-cruiser packages --config .dependency-cruiser.cjs",
    "deps:graph": "dependency-cruiser packages --config .dependency-cruiser.cjs --output-type dot | dot -T svg > dependency-graph.svg"
  }
}
```

## Step 4: Test the Configuration

```bash
# Check for violations
pnpm deps:check

# Generate visual graph (requires graphviz)
# Install graphviz if needed: sudo apt install graphviz
pnpm deps:graph
```

## Step 5: Optional CI Integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Check dependency boundaries
  run: pnpm deps:check
```

## Validation

```bash
# Should complete without errors (or report actual violations)
pnpm deps:check

# Should generate SVG file
pnpm deps:graph
ls dependency-graph.svg
```

## Acceptance Criteria

- [x] `dependency-cruiser` installed as devDependency
- [x] `.dependency-cruiser.cjs` configuration created
- [x] `deps:check` script works
- [x] `deps:graph` script works (graphviz optional)
- [x] No circular dependencies detected (or documented)
- [x] schemas package has no internal deps (verified)

## Deliverables

1. Configuration file
2. npm scripts for checking deps
3. Optional: dependency-graph.svg in repo (or .gitignore it)

## Notes

- `.cjs` extension needed for CommonJS config in ESM repo
- Start with `warn` severity if many violations, upgrade to `error` incrementally
- Graph visualization helps understand architecture at a glance
- Added a root `tsconfig.json` that extends `tsconfig.base.json` so dependency-cruiser can resolve TypeScript settings referenced by the new config.
- Current config lives at `scripts/lint/dependency-cruiser.cjs` and scripts point there.
