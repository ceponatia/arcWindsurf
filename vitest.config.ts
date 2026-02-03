import { defineConfig, defaultExclude } from 'vitest/config';

/**
 * Root Vitest config for running tests from the repository root.
 *
 * Note: some environments configure PNPM's store inside the repo (e.g. `.pnpm-store/`).
 * Vitest's defaults don't exclude that path, which can cause tests to be discovered and
 * executed twice (once from the workspace and once from the store snapshot), leading to
 * global matcher collisions like `Symbol($$jest-matchers-object)`.
 */
export default defineConfig({
  test: {
    exclude: [
      ...defaultExclude,
      '**/.pnpm-store/**',
      '**/.turbo/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
    ],
  },
});
