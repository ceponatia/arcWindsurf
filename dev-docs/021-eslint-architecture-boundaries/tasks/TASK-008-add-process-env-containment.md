# TASK-008: Add Process.env Containment Rule

**Priority**: P2
**Status**: Completed
**Estimate**: 45 minutes
**Depends On**: None
**Category**: ESLint Configuration

---

## Objective

Restrict `process.env` access to dedicated config/env modules. This centralizes environment configuration and makes it easier to mock in tests.

## File to Modify

`eslint.config.mjs`

## Implementation Strategy

Use separate config blocks: one that allows `process.env` in config files, and a general block that restricts it.

### Option A: File-Based Override

```javascript
// In eslint.config.mjs

// Config files can use process.env
{
  files: [
    'packages/*/src/**/config.ts',
    'packages/*/src/**/config/*.ts',
    'packages/*/src/**/env.ts',
    'packages/*/src/**/settings.ts',
    'packages/api/src/index.ts',  // Server entry point
  ],
  rules: {
    // Allow process in these files
  },
},

// All other source files
{
  files: ['packages/*/src/**/*.{ts,tsx}'],
  ignores: [
    'packages/*/src/**/config.ts',
    'packages/*/src/**/config/*.ts',
    'packages/*/src/**/env.ts',
    'packages/*/src/**/settings.ts',
  ],
  rules: {
    'no-restricted-syntax': ['warn', {
      selector: 'MemberExpression[object.object.name="process"][object.property.name="env"]',
      message: 'Access process.env only in config modules (config.ts, env.ts, settings.ts). Import config values instead.',
    }],
  },
},
```

### Option B: Custom Rule (More Precise)

If Option A has false positives, create `config/eslint/rules/process-env-containment.mjs`:

```javascript
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Restrict process.env to config modules',
    },
    messages: {
      envOutsideConfig:
        'Access process.env only in config modules. Import configuration values instead.',
    },
  },
  create(context) {
    const filename = context.filename;
    const isConfigFile =
      filename.includes('/config.ts') ||
      filename.includes('/config/') ||
      filename.includes('/env.ts') ||
      filename.includes('/settings.ts') ||
      filename.endsWith('/index.ts'); // Server entry

    if (isConfigFile) return {};

    return {
      MemberExpression(node) {
        if (
          node.object?.type === 'MemberExpression' &&
          node.object.object?.name === 'process' &&
          node.object.property?.name === 'env'
        ) {
          context.report({
            node,
            messageId: 'envOutsideConfig',
          });
        }
      },
    };
  },
};
```

## Validation

```bash
# Find existing process.env usage
grep -r "process\.env" packages/*/src --include="*.ts" | grep -v "config\|env\|settings"

# Run lint
pnpm lint
```

## Acceptance Criteria

- [x] Rule configured in `eslint.config.mjs`
- [x] Config files (`config.ts`, `env.ts`, `settings.ts`) can use process.env
- [x] Other files receive warning when accessing process.env
- [x] `pnpm lint` runs without config errors
- [x] Existing violations documented

## Recommended Config Module Pattern

Create `packages/api/src/config.ts`:

```typescript
export const config = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
  openRouterModel: process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-v3.2',
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;
```

Then import:

```typescript
import { config } from '../config';
// Use config.openRouterApiKey instead of process.env.OPENROUTER_API_KEY
```

## Existing Violations

All `process.env` usages are in config/env files (properly exempted) except one:

- `packages/characters/src/utils/dataDir.ts` - assigns `process.env` to a typed local variable. Not flagged by the current `no-restricted-syntax` selector because it matches `process.env.X` (three-level member expressions) but not bare `process.env` assignment. Low risk since the pattern is equivalent to a config module.

Config-file usages (all exempted, no action needed):

- `packages/api/src/utils/config.ts`
- `packages/api/src/utils/env.ts`
- `packages/bus/src/config.ts`
- `packages/db/src/cache/config.ts`
- `packages/llm/src/config.ts`
- `packages/retrieval/src/config.ts`
- `packages/workers/src/config.ts`

## Notes

- Start with `'warn'` severity
- Server entry points (`index.ts`) may legitimately need process.env
- Test files are already excluded from linting
- Consider creating a shared config pattern across packages
