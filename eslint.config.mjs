import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';

export default tseslint.config(
  // Global ignores (flat config replaces .eslintignore)
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/package.json',
      'packages/*/test/**',
      'packages/web/src/shared/hooks/useFetchOnce.test.ts',
    ],
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
  plugins: {
    security,
  },
  extends: [
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ],
  rules: {
    // Match Codacy's "Detect Object Injection"
    'security/detect-object-injection': 'warn',
  },
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
},
  // Disable formatting rules to let Prettier handle formatting
  eslintConfigPrettier
);
