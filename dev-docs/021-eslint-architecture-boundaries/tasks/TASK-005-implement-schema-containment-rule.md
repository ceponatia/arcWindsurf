# TASK-005: Implement Schema Containment Rule

**Priority**: P1
**Status**: ✅ Completed
**Estimate**: 2-3 hours
**Depends On**: None
**Category**: Custom ESLint Rule

---

## Objective

Create a custom ESLint rule that prevents exported Zod schemas from being defined outside the `@minimal-rpg/schemas` package. Local (non-exported) schemas for internal validation are allowed.

## File to Create

`config/eslint/rules/schemas-only-in-schemas-package.mjs`

## Implementation

```javascript
// config/eslint/rules/schemas-only-in-schemas-package.mjs

/**
 * Check if a node is a Zod method call (z.object, z.string, etc.)
 */
function isZodSchemaCall(node) {
  if (!node) return false;

  // Direct: z.object({...})
  if (
    node.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    node.callee.object?.name === 'z'
  ) {
    return true;
  }

  // Chained: z.object({...}).refine(...)
  if (
    node.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    node.callee.object?.type === 'CallExpression'
  ) {
    return isZodSchemaCall(node.callee.object);
  }

  return false;
}

/**
 * Check if identifier name looks like a schema (ends with Schema)
 */
function isSchemaName(name) {
  return name && name.endsWith('Schema');
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Exported Zod schemas must be defined in @minimal-rpg/schemas',
    },
    schema: [
      {
        type: 'object',
        properties: {
          repoRoot: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      schemaOutsidePackage:
        "Exported Zod schema '{{name}}' should be defined in @minimal-rpg/schemas. " +
        'Create the schema there and import it here for local use.',
    },
  },
  create(context) {
    const filename = context.filename;
    const isInSchemasPackage = filename.includes('/packages/schemas/');

    // Skip if we're in the schemas package
    if (isInSchemasPackage) {
      return {};
    }

    return {
      // Detect: export const FooSchema = z.object({...})
      ExportNamedDeclaration(node) {
        if (!node.declaration) return;
        if (node.declaration.type !== 'VariableDeclaration') return;

        for (const declarator of node.declaration.declarations) {
          const name = declarator.id?.name;

          // Check if it's a schema by name convention
          if (!isSchemaName(name)) continue;

          // Check if it's a Zod call
          if (!isZodSchemaCall(declarator.init)) continue;

          context.report({
            node: declarator.id,
            messageId: 'schemaOutsidePackage',
            data: { name },
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
import schemasOnlyInSchemasPackage from './rules/schemas-only-in-schemas-package.mjs';

const plugin = {
  rules: {
    'no-duplicate-exported-types': { /* existing */ },
    'package-layer-boundaries': { /* from TASK-004 */ },
    'schemas-only-in-schemas-package': schemasOnlyInSchemasPackage,
  },
};
```

Update `eslint.config.mjs`:

```javascript
rules: {
  'minimal-rpg/schemas-only-in-schemas-package': ['warn', {
    repoRoot: import.meta.dirname,
  }],
}
```

## Validation

```bash
# Search for potential violations first
grep -r "export.*Schema.*=.*z\." packages/*/src --include="*.ts" | grep -v "packages/schemas/"

# Run lint
pnpm lint

# Test with intentional violation
# In packages/api/src/test-schema.ts:
# export const TestSchema = z.object({ foo: z.string() });
# Should report warning
```

Validation notes:
- Existing violations: none found by rg.
- Intentional violation in api triggered `minimal-rpg/schemas-only-in-schemas-package` as expected.

## Acceptance Criteria

- [x] Rule file created at `config/eslint/rules/schemas-only-in-schemas-package.mjs`
- [x] Rule integrated into `minimal-rpg-eslint-plugin.mjs`
- [x] Rule enabled in `eslint.config.mjs` (error mode)
- [x] `pnpm lint` runs without config errors
- [x] Rule correctly identifies exported schemas outside schemas package
- [x] Rule ignores non-exported (local) schemas
- [x] Any existing violations documented

## Notes

- Uses naming convention (`*Schema`) as heuristic - Zod AST detection is a bonus
- Start with `'warn'` severity to identify scope
- Non-exported schemas for local validation (e.g., request body parsing) are allowed
- Some packages may have legitimate local schemas - document exceptions if needed
- Current config uses `error` severity.
