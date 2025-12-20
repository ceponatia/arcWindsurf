// Workspace-style Vitest config that aggregates package configs.
// Exporting an array is supported by Vitest and avoids the extension warning.
export default [
  'packages/agents/vitest.config.ts',
  'packages/api/vitest.config.ts',
  'packages/db/vitest.config.ts',
  'packages/governor/vitest.config.ts',
  'packages/schemas/vitest.config.ts',
  'packages/state-manager/vitest.config.ts',
  'packages/web/vitest.config.ts',
];
