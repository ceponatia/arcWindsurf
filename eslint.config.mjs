import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores (flat config replaces .eslintignore)
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
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
  // Disable formatting rules to let Prettier handle formatting
  eslintConfigPrettier,
);
