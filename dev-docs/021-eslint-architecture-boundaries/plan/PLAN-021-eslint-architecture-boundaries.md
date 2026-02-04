# ESLint Architecture Boundaries Implementation Plan

## Overview

This document outlines how to implement ESLint-based architectural boundaries to enforce code organization, prevent cross-package anti-patterns, and ensure proper use of shared packages like `@minimal-rpg/schemas` and `@minimal-rpg/utils`.

## Current State

The codebase already has:

- Custom ESLint plugin (`minimal-rpg/no-duplicate-exported-types`) that detects duplicate type definitions across packages
- Type-checked linting via `typescript-eslint`
- 15 packages under `@minimal-rpg/*` namespace

### Current Package Dependency Graph (simplified)

```text
schemas (foundation - no internal deps)
   ↑
utils (depends on: schemas)
   ↑
db (depends on: schemas, utils)
   ↑
bus (depends on: schemas)
   ↑
retrieval (depends on: schemas, db)
   ↑
services (depends on: schemas, db, bus, llm)
   ↑
actors (depends on: schemas, services, bus, llm)
   ↑
api (depends on: nearly everything - orchestration layer)
   ↑
web (depends on: schemas, utils, ui, generator, db)
```

## Proposed Rules

### 1. Schema Containment Rule

**Goal:** Prevent Zod schemas from being defined outside `@minimal-rpg/schemas`.

```javascript
// In eslint.config.mjs - add to minimal-rpg plugin
'minimal-rpg/schemas-only-in-schemas-package': ['error', {
  repoRoot: import.meta.dirname,
}]
```

**Implementation approach:**

- Detect `z.object()`, `z.string()`, `z.enum()`, etc. calls that are exported
- Report error if not in `packages/schemas/`
- Allow local (non-exported) schema usage for internal validation

### 2. Package Layer Boundaries

**Goal:** Enforce dependency direction - lower layers cannot import from higher layers.

```javascript
// Package layers (lower number = lower layer)
const packageLayers = {
  'schemas': 0,      // Foundation - no internal deps allowed
  'utils': 1,        // Basic helpers
  'db': 2,           // Data layer
  'bus': 2,          // Event layer (same level as db)
  'llm': 2,          // LLM abstraction
  'generator': 3,    // Content generation
  'retrieval': 3,    // Data retrieval
  'projections': 3,  // Read models
  'characters': 3,   // Character logic
  'services': 4,     // Business logic
  'actors': 5,       // State machines
  'ui': 5,           // UI components
  'api': 6,          // API orchestration
  'web': 6,          // Frontend app
  'workers': 6,      // Background workers
};
```

**Rule logic:**

- `schemas` cannot import from ANY `@minimal-rpg/*` package
- `utils` can only import from `schemas`
- Higher layers can import from lower layers, but not vice versa
- Same-level packages can import from each other (with exceptions)

### 3. Public API Enforcement

**Goal:** Prevent deep imports into package internals.

```javascript
'no-restricted-imports': ['error', {
  patterns: [
    {
      group: ['@minimal-rpg/*/src/*', '@minimal-rpg/*/dist/*'],
      message: 'Import from package root (@minimal-rpg/pkg) or explicit subpath exports, not internals.',
    },
  ],
}]
```

### 4. Shared Utility Decision Guide

**When to add to `@minimal-rpg/utils`:**

- Used by 3+ packages
- Domain-agnostic (no game-specific logic)
- Stable API unlikely to change frequently
- Examples: `generateId()`, `isUuid()`, `deepMergeReplaceArrays()`

**When to keep in package:**

- Used by only 1-2 packages
- Domain-specific logic
- Likely to evolve with the package
- Examples: package-specific validation helpers, domain mappers

**Rule:** Add a custom ESLint rule or script that warns when similar utility patterns appear in multiple packages, suggesting consolidation.

### 5. No Cross-Package Relative Imports

**Goal:** All cross-package imports must use the `@minimal-rpg/*` namespace.

```javascript
'no-restricted-imports': ['error', {
  patterns: [
    {
      group: ['../../packages/*', '../../../packages/*'],
      message: 'Use @minimal-rpg/* imports instead of relative cross-package paths.',
    },
  ],
}]
```

### 6. Database Access Boundary

**Goal:** Only specific packages can directly access the database layer.

```javascript
// Packages allowed to import from @minimal-rpg/db
const dbAccessAllowed = ['api', 'retrieval', 'services', 'projections', 'web'];

// All other packages must go through services/retrieval
```

### 7. Console.log Prevention

**Goal:** Enforce structured logging.

```javascript
'no-console': ['error', {
  allow: ['warn', 'error'], // Or use no-console completely and require logger import
}]
```

### 8. Process.env Containment

**Goal:** Environment variables should only be accessed in config modules.

```javascript
'no-restricted-globals': ['error', {
  name: 'process',
  message: 'Access process.env only through @minimal-rpg/*/config or dedicated config modules.',
}]
```

**Exception pattern:** Allow in files matching `**/config.ts`, `**/env.ts`, `**/settings.ts`.

## Implementation Plan

### Phase 1: Foundation (Low Risk)

1. Add `no-restricted-imports` for deep imports
2. Add `no-restricted-imports` for relative cross-package paths
3. Add `no-console` rule (or logger enforcement)

### Phase 2: Layer Boundaries (Medium Risk)

1. Implement `minimal-rpg/package-layer-boundaries` rule
2. Configure allowed import directions
3. Run in warn mode first, then error mode

### Phase 3: Schema Containment (Medium Risk)

1. Implement `minimal-rpg/schemas-only-in-schemas-package` rule
2. Audit existing code for violations
3. Migrate any found schemas to `@minimal-rpg/schemas`

### Phase 4: Coupling Detection (Analysis)

1. Integrate `dependency-cruiser` for graph analysis
2. Add CI check for circular dependencies
3. Set thresholds for max connections per package

## Custom Rule Implementations

### Rule: `schemas-only-in-schemas-package`

```javascript
// Pseudocode for custom rule
{
  meta: {
    type: 'problem',
    docs: {
      description: 'Exported Zod schemas must be defined in @minimal-rpg/schemas',
    },
  },
  create(context) {
    const filename = context.filename;
    const isInSchemasPackage = filename.includes('/packages/schemas/');

    return {
      // Detect: export const FooSchema = z.object({...})
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator': (node) => {
        if (isInSchemasPackage) return;
        if (!isZodSchemaCall(node.init)) return;

        context.report({
          node,
          message: 'Exported Zod schemas should be defined in @minimal-rpg/schemas. ' +
                   'Create the schema there and import it here.',
        });
      },
    };
  },
}
```

### Rule: `package-layer-boundaries`

```javascript
// Pseudocode for layer boundary rule
{
  create(context) {
    const currentPackage = getPackageFromPath(context.filename);
    const currentLayer = packageLayers[currentPackage];

    return {
      ImportDeclaration(node) {
        const importedPackage = parseMinimalRpgImport(node.source.value);
        if (!importedPackage) return;

        const importedLayer = packageLayers[importedPackage];

        if (importedLayer > currentLayer) {
          context.report({
            node,
            message: `Package '${currentPackage}' (layer ${currentLayer}) cannot import from ` +
                     `'${importedPackage}' (layer ${importedLayer}). ` +
                     `Lower layers cannot depend on higher layers.`,
          });
        }
      },
    };
  },
}
```

## Dependency Graph Tools (Complementary)

### dependency-cruiser Configuration

```javascript
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'schemas-no-internal-deps',
      severity: 'error',
      from: { path: '^packages/schemas/' },
      to: { path: '^packages/(?!schemas/)' },
    },
  ],
};
```

### CI Integration

```yaml
# In CI workflow
- name: Check dependency boundaries
  run: npx dependency-cruiser packages --validate
```

## Migration Strategy for Violations

When violations are found:

1. **For duplicate types:** Canonicalize in `@minimal-rpg/schemas`, use `Pick<>`/`Omit<>` for variants
2. **For misplaced schemas:** Move to `@minimal-rpg/schemas`, import where needed
3. **For layer violations:** Either move code to appropriate layer or create a service interface
4. **For deep imports:** Add explicit subpath export or import from package root

## Metrics to Track

- Number of layer boundary violations (should decrease to 0)
- Number of duplicate types (via existing rule)
- Package coupling score (connections per package)
- Circular dependency count

## Future Enhancements

1. **Auto-fix capabilities:** Some rules could auto-fix imports to use correct paths
2. **VS Code integration:** Show boundary violations in editor
3. **Dashboard:** Visual dependency graph in dev-docs
4. **knip integration:** Detect unused exports to reduce coupling surface

## Quick Wins (Implement First)

These can be added to `eslint.config.mjs` immediately:

```javascript
// Add to rules section
rules: {
  // Existing rules...

  // Prevent deep imports
  'no-restricted-imports': ['error', {
    patterns: [
      {
        group: ['@minimal-rpg/*/src/*', '@minimal-rpg/*/dist/*'],
        message: 'Import from package root, not internals.',
      },
      {
        group: ['../../packages/*', '../../../packages/*'],
        message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
      },
    ],
  }],

  // Encourage structured logging
  'no-console': ['warn', { allow: ['warn', 'error'] }],
}
```

## References

- [ESLint no-restricted-imports](https://eslint.org/docs/rules/no-restricted-imports)
- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
- [knip](https://knip.dev/) - unused exports detection
