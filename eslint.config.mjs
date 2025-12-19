import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores (flat config replaces .eslintignore)
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
  // Tooling/config files inside packages (no type-aware linting)
  {
    files: [
      'packages/*/*.config.{ts,js,cjs,mjs}',
      'packages/*/vitest.config.ts',
      'packages/*/vite.config.ts',
      'packages/*/tsup.config.ts',
      'packages/*/tsup.config.*.{ts,js,cjs,mjs}',
    ],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
  },
  // TypeScript + JS rules for source files across packages
  {
    files: ['packages/*/src/**/*.{ts,tsx,js}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        // Use TypeScript project service to pick up each package tsconfig
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Tests across packages (includes Vitest globals)
  {
    files: ['packages/*/test/**/*.{ts,tsx,js}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        describe: true,
        test: true,
        it: true,
        expect: true,
        vi: true,
        beforeAll: true,
        afterAll: true,
        beforeEach: true,
        afterEach: true,
      },
    },
  },
  // Disable formatting rules to let Prettier handle formatting
  eslintConfigPrettier
);
