# Copilot Instructions for Minimal RPG

This monorepo uses pnpm + Turbo with these packages:

- `packages/schemas` — Zod schemas for domain + prompt config
- `packages/shared` — shared types and helpers (re-exports schemas)
- `packages/api` — Hono-based Node API server (Postgres + LLM integration)
- `packages/web` — Vite web client
- `packages/utils` — shared runtime utilities
- Data at repo root: `data/characters/*.json`, `data/settings/*.json`

## Important

- Each package should have a src/types.ts file for shared types. Use existing types in these files when possible, or add a new type there. Make sure types are STRONGLY typed.
- After finishing a task, update the root `README.md` with any relevant changes and keep it accurate and concise. Do not remove unrelated information.
- Put requested developer notes or docs in `/dev-docs`.
- For markdown lint issues, prefer `markdownlint --fix`.
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
- Typecheck + lint: prefer `pnpm check` (runs both), or `pnpm -w typecheck` / `pnpm -w lint`.
- Run packages:
  - API dev: `pnpm -F @minimal-rpg/api dev`
  - API prod: `pnpm -F @minimal-rpg/api build && pnpm -F @minimal-rpg/api start`
  - Web dev: `pnpm -F @minimal-rpg/web dev`
- Data validation helper (optional): `node ./scripts/validate-data.js`.

## Data & Schemas

- Character files live in `data/characters/*.json`; settings in `data/settings/*.json`.
- Files must conform to `@minimal-rpg/schemas`.
  - Required minimums: non-empty `name` and `summary`; character `goals` is an array of non-empty strings; optional arrays: `tags`, `constraints`.
- Example validation:

  ```ts
  import { CharacterProfileSchema, type CharacterProfile } from '@minimal-rpg/schemas';

  const parsed = CharacterProfileSchema.parse(obj);
  const character: CharacterProfile = parsed;
  ```

- Run API with a custom data dir:
  ```bash
  DATA_DIR=/abs/path/to/data pnpm -F @minimal-rpg/api dev
  ```

## Patterns to Follow

- Use shared Zod schemas for runtime validation; avoid duplicate type definitions.
- Keep imports ESM-correct with explicit `.js` for local paths (because of `verbatimModuleSyntax`).
- API should fail fast and clearly on invalid data (see `loader.ts`).
- Prefer small, self-contained JSON files; missing data subdirs are treated as empty.

## LLM Integration

- The API uses OpenRouter with the DeepSeek 3 model as the default LLM.
- Prompt configuration schemas live under `packages/schemas/src/api`.

## Key Files

- Root: `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `README.md`
- Schemas: `packages/schemas/src/index.ts`
- Shared: `packages/shared/src/index.ts` (re-exports from `@minimal-rpg/schemas`)
- API: `packages/api/src/data/loader.ts`, `packages/api/src/server.ts`, `packages/api/src/llm`
- Web: `packages/web/src`
- Data: `data/README.md`, `data/characters/example.json`, `data/settings/example.json`

If anything here looks outdated or unclear, update this file along with any affected docs.
