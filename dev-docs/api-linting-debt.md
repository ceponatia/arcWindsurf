# API Linting Debt

The `@minimal-rpg/api` package currently has 654 linting problems (635 errors, 19 warnings).
The errors are primarily related to:
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-member-access`
- `@typescript-eslint/no-unsafe-call`
- `@typescript-eslint/no-unsafe-argument`
- `@typescript-eslint/prefer-nullish-coalescing`

These issues require substantial refactoring to resolve properly while maintaining type safety. Per the project instructions, this has been documented and deferred to prioritize foundational cleanup and security fixes in other packages.
