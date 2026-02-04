/**
 * Vitest workspace config.
 *
 * In Vitest v4, `vitest/config` does not export `defineWorkspace`. Workspace files
 * should default-export an array of projects.
 */
export default [
  'packages/actors/vitest.config.ts',
  'packages/api/vitest.config.ts',
  'packages/bus/vitest.config.ts',
  'packages/characters/vitest.config.ts',
  'packages/db/vitest.config.ts',
  'packages/generator/vitest.config.ts',
  'packages/llm/vitest.config.ts',
  'packages/projections/vitest.config.ts',
  'packages/retrieval/vitest.config.ts',
  'packages/schemas/vitest.config.ts',
  'packages/services/vitest.config.ts',
  'packages/ui/vitest.config.ts',
  'packages/utils/vitest.config.ts',
  'packages/web/vitest.config.ts',
  'packages/workers/vitest.config.ts',
];
