import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineWorkspace } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineWorkspace([
  'packages/agents/vitest.config.ts',
  'packages/api/vitest.config.ts',
  'packages/db/vitest.config.ts',
  'packages/governor/vitest.config.ts',
  'packages/schemas/vitest.config.ts',
  'packages/state-manager/vitest.config.ts',
  'packages/web/vitest.config.ts',
  {
    test: {
      globals: true,
      coverage: {
        enabled: true,
        reportsDirectory: resolve(__dirname, './.codacy/coverage'),
        reporter: ['text', 'lcov'],
      },
    },
  },
]);
