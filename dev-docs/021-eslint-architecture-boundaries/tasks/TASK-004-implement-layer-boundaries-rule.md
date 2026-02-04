# TASK-004: Implement Package Layer Boundaries Rule

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 2-3 hours
**Depends On**: None
**Category**: Custom ESLint Rule

---

## Objective

Create a custom ESLint rule that enforces dependency direction between packages. Lower-layer packages cannot import from higher-layer packages.

## File to Create

`config/eslint/rules/package-layer-boundaries.mjs`

## Package Layer Definition

```javascript
const packageLayers = {
  'schemas': 0,      // Foundation - no internal deps allowed
  'utils': 1,        // Basic helpers (depends on: schemas)
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

## Implementation

```javascript
// config/eslint/rules/package-layer-boundaries.mjs
import path from 'node:path';

const packageLayers = {
  schemas: 0,
  utils: 1,
  db: 2,
  bus: 2,
  llm: 2,
  generator: 3,
  retrieval: 3,
  projections: 3,
  characters: 3,
  services: 4,
  actors: 5,
  ui: 5,
  api: 6,
  web: 6,
  workers: 6,
};

function getPackageFromPath(filePath) {
  const match = filePath.match(/packages\/([^/]+)\//);
  return match ? match[1] : null;
}

function parseMinimalRpgImport(importPath) {
  const match = importPath.match(/^@minimal-rpg\/([^/]+)/);
  return match ? match[1] : null;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce package layer boundaries - lower layers cannot import from higher layers',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowSameLevel: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      layerViolation:
        "Package '{{currentPkg}}' (layer {{currentLayer}}) cannot import from '{{importedPkg}}' (layer {{importedLayer}}). Lower layers cannot depend on higher layers.",
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const allowSameLevel = options.allowSameLevel !== false;
    const currentPackage = getPackageFromPath(context.filename);

    if (!currentPackage || !(currentPackage in packageLayers)) {
      return {};
    }

    const currentLayer = packageLayers[currentPackage];

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const importedPackage = parseMinimalRpgImport(importPath);

        if (!importedPackage || !(importedPackage in packageLayers)) {
          return;
        }

        const importedLayer = packageLayers[importedPackage];

        // Block imports from higher layers
        if (importedLayer > currentLayer) {
          context.report({
            node: node.source,
            messageId: 'layerViolation',
            data: {
              currentPkg: currentPackage,
              currentLayer,
              importedPkg: importedPackage,
              importedLayer,
            },
          });
        }
      },
    };
  },
};
```

## Integration

Update `config/eslint/minimal-rpg-eslint-plugin.mjs`:

```javascript
import packageLayerBoundaries from './rules/package-layer-boundaries.mjs';

const plugin = {
  rules: {
    'no-duplicate-exported-types': { /* existing */ },
    'package-layer-boundaries': packageLayerBoundaries,
  },
};
```

Update `eslint.config.mjs`:

```javascript
rules: {
  'minimal-rpg/package-layer-boundaries': ['warn', {
    allowSameLevel: true,
  }],
}
```

## Validation

```bash
# Run lint - should report any layer violations as warnings
pnpm lint

# Intentionally create a violation to test
# In packages/schemas/src/test-violation.ts:
# import { something } from '@minimal-rpg/api';
# Should report error
```

## Acceptance Criteria

- [ ] Rule file created at `config/eslint/rules/package-layer-boundaries.mjs`
- [ ] Rule integrated into `minimal-rpg-eslint-plugin.mjs`
- [ ] Rule enabled in `eslint.config.mjs` (warn mode)
- [ ] `pnpm lint` runs without config errors
- [ ] Rule correctly reports violations (test with intentional violation)
- [ ] Any existing violations documented for follow-up

## Notes

- Start with `'warn'` severity to identify scope of violations
- Upgrade to `'error'` once all violations are resolved
- `allowSameLevel: true` permits same-layer imports (e.g., db <-> bus)
