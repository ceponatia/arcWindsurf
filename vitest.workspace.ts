/**
 * Vitest workspace config.
 *
 * In Vitest v4, `vitest/config` does not export `defineWorkspace`. Workspace files
 * should default-export an array of projects.
 */
export default [
  'packages/actors/vitest.config.ts',
  'packages/api/vitest.config.ts',
  'packages/db/vitest.config.ts',
  'packages/schemas/vitest.config.ts',
  'packages/ui/vitest.config.ts',
  'packages/utils/vitest.config.ts',
  'packages/web/vitest.config.ts',
  'packages/workers/vitest.config.ts',
];
