# Copilot Instructions for Minimal RPG

This monorepo uses pnpm + Turbo with these packages:

- `packages/schemas` — Zod schemas for domain + prompt config
- `packages/shared` — shared types and helpers (re-exports schemas)
- `packages/api` — Hono-based Node API server (Postgres + LLM integration)
- `packages/web` — Vite web client
- `packages/utils` — shared runtime utilities
- Data at repo root: `data/characters/*.json`, `data/settings/*.json`

## Important

- Read the folder's README.md files for package-specific info.
- Follow existing code style and patterns.
- Each package should have a src/types.ts file for shared types. Use existing types in these files when possible, or add a new type there. Make sure types are STRONGLY typed.
- After finishing a task, update the root `README.md` with any relevant changes and keep it accurate and concise. Do not remove unrelated information.
- Put requested developer notes or docs in `/dev-docs`.
- When running terminal commands such as curl and node scripts, either configure the script to return an error or quit after a period of time, or use a sleep command to avoid infinite loops.

## Architecture & Conventions

- TypeScript + ESM everywhere. `tsconfig.base.json` sets `verbatimModuleSyntax: true`.
  - Local imports must include `.js` (e.g., `import { X } from './file.js'`).
  - API uses `NodeNext` module/resolution; shared/web use `Bundler`.
- Shared schemas live in `packages/schemas/src/index.ts` and are exported via `@minimal-rpg/schemas`.
  - Exported: `CharacterProfileSchema`, `SettingProfileSchema` and types `CharacterProfile`, `SettingProfile`.
  - `packages/shared` re-exports these; new code should import from `@minimal-rpg/schemas` directly.
- Data loader: `packages/api/src/data/loader.ts`.
  - Reads JSON under `data/characters` and `data/settings`.
  - Validates with shared Zod schemas; on any error, logs and exits non-zero (fail-fast).
  - Uses `DATA_DIR` env var if set, otherwise `process.cwd()/data`.
- Server startup: `packages/api/src/server.ts`.
  - Calls the loader before binding the port and keeps validated data in-memory.
  - When running the dev server, use a separate/background terminal to avoid blocking this agent.

## Developer Workflows

- Install/build all: `pnpm -w install` then `pnpm -w build` (Turbo runs `tsc` into `dist/`).
- Typecheck + lint: prefer `pnpm -w typecheck` / `pnpm -w lint`.

## Patterns to Follow

- Use shared Zod schemas for runtime validation; avoid duplicate type definitions.
- Do not write functional code in schema files—keep them focused on data structure.
- Use explicit types for function parameters and return values for clarity.
- Write small, focused functions that do one thing well.
- Use async/await for asynchronous code; avoid mixing with .then()/.catch().
- Handle errors gracefully with try/catch and provide meaningful messages.
- Write JSDoc comments for all functions and complex logic.
- Use the standard ASCII '-' for hyphens and dashes in source and documentation; avoid typographic variants like '–', '—', or non-breaking hyphens.

## LLM Integration

- The API uses OpenRouter with the DeepSeek 3 model as the default LLM.
- Prompt configuration schemas live under `packages/schemas/src/api`.
- When modifying prompts, ensure changes are reflected in both the schema and the prompt templates.
