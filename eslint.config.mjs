import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';
import minimalRpg from './config/eslint/minimal-rpg-eslint-plugin.mjs';

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
      'packages/web/src/layouts/__tests__/**',
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
      'minimal-rpg': minimalRpg,
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

      // Cross-package type consolidation enforcement
      'minimal-rpg/no-duplicate-exported-types': [
        'error',
        {
          repoRoot: import.meta.dirname,
          ignoreTypeNames: [],
        },
      ],
      'minimal-rpg/package-layer-boundaries': [
        'warn',
        {
          allowSameLevel: true,
        },
      ],
      'minimal-rpg/schemas-only-in-schemas-package': [
        'warn',
        {
          repoRoot: import.meta.dirname,
        },
      ],

      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@minimal-rpg/*/src/*', '@minimal-rpg/*/src/**'],
              message:
                'Import from package root (@minimal-rpg/pkg) or explicit subpath exports, not /src/ internals.',
            },
            {
              group: ['@minimal-rpg/*/dist/*', '@minimal-rpg/*/dist/**'],
              message:
                'Import from package root (@minimal-rpg/pkg) or explicit subpath exports, not /dist/ internals.',
            },
            {
              group: ['../../packages/*', '../../packages/**'],
              message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
            },
            {
              group: ['../../../packages/*', '../../../packages/**'],
              message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
            },
            {
              group: ['../../../../packages/*', '../../../../packages/**'],
              message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
            },
          ],
        },
      ],

      // Discourage console.log - use structured logging
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info', 'debug'],
        },
      ],

      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'MemberExpression[object.object.name="process"][object.property.name="env"]',
          message:
            'Access process.env only in config modules (config.ts, env.ts, settings.ts). Import config values instead.',
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Restrict direct @minimal-rpg/db imports in specific packages
  {
    files: [
      'packages/schemas/src/**/*.ts',
      'packages/utils/src/**/*.ts',
      'packages/bus/src/**/*.ts',
      'packages/llm/src/**/*.ts',
      'packages/generator/src/**/*.ts',
      'packages/characters/src/**/*.ts',
      'packages/actors/src/**/*.ts',
      'packages/ui/src/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@minimal-rpg/db',
              message:
                'This package should not import @minimal-rpg/db directly. Use @minimal-rpg/services or @minimal-rpg/retrieval instead.',
            },
          ],
          patterns: [
            {
              group: ['@minimal-rpg/db/*', '@minimal-rpg/db/**'],
              message:
                'This package should not import @minimal-rpg/db directly. Use services/retrieval layer.',
            },
            {
              group: ['@minimal-rpg/*/src/*', '@minimal-rpg/*/src/**'],
              message:
                'Import from package root (@minimal-rpg/pkg) or explicit subpath exports, not /src/ internals.',
            },
            {
              group: ['@minimal-rpg/*/dist/*', '@minimal-rpg/*/dist/**'],
              message:
                'Import from package root (@minimal-rpg/pkg) or explicit subpath exports, not /dist/ internals.',
            },
            {
              group: ['../../packages/*', '../../packages/**'],
              message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
            },
            {
              group: ['../../../packages/*', '../../../packages/**'],
              message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
            },
            {
              group: ['../../../../packages/*', '../../../../packages/**'],
              message: 'Use @minimal-rpg/* imports for cross-package dependencies.',
            },
          ],
        },
      ],
    },
  },
  // Config files can use process.env
  {
    files: [
      'packages/*/src/**/config.ts',
      'packages/*/src/**/config/*.ts',
      'packages/*/src/**/env.ts',
      'packages/*/src/**/settings.ts',
      'packages/api/src/index.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  // Disable formatting rules to let Prettier handle formatting
  eslintConfigPrettier
);
