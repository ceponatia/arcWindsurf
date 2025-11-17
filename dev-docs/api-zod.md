# Zod Usage in @minimal-rpg/api

This document lists all source files in the API package that currently depend on `zod` (either directly or via types).

## Source Files

- `packages/api/src/llm/prompt.ts`
  - `import { z } from 'zod';`
  - Uses `z` to validate loaded JSON prompt configuration (system prompt and safety rules) at startup.

- `packages/api/src/data/loader.ts`
  - `import type { ZodType } from 'zod';`
  - Uses `ZodType` as a type-only dependency for the generic data loader to validate character/setting JSON against shared schemas from `@minimal-rpg/schemas`.

## Notes

- Compiled artifacts under `packages/api/dist/**` also contain `zod` imports but should not be modified directly; they are derived from `src`.
- Any future Zod usage in the API should be added to this list for quick reference when refactoring validation or moving toward centralized schema usage in `@minimal-rpg/schemas`.
