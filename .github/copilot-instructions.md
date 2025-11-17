# Copilot Instructions for Minimal RPG

This monorepo uses pnpm + Turbo with four packages:

- `packages/schemas` — Zod schemas for domain profiles
- `packages/shared` — shared types and helpers (re-exports schemas)
- `packages/api` — Hono-based Node API server
- `packages/web` — Vite web client (scaffolded)
- Data at repo root: `data/characters/*.json`, `data/settings/*.json`

## Important

- After all todo tasks are done / the work required by the prompt is complete, read the root README.md file, add any necessary details related to the work you just did, and then clean up the overall README.md file to ensure it is accurate, concise and up to date. Do not remove any information that was not affected by your current work.
- When writing requested developer notes or documents, put them in /dev-docs.
- To fix markdown lint issues, try using markdownlint --fix.

## Architecture & Conventions

- TypeScript + ESM across the repo. `tsconfig.base.json` sets `verbatimModuleSyntax: true`.
  - When importing local files, include the `.js` extension in TS code (e.g., `import { X } from './file.js'`).
  - API overrides to `NodeNext` module/resolution; shared/web use `Bundler`.
- Shared schemas live in `packages/schemas/src/index.ts` and are exported via the package `@minimal-rpg/schemas`.
  - Exported: `CharacterProfileSchema`, `SettingProfileSchema` and inferred types `CharacterProfile`, `SettingProfile`.
  - `packages/shared` re-exports these for compatibility, but new code should import from `@minimal-rpg/schemas` directly.
- Data loader lives in `packages/api/src/data/loader.ts`.
  - Reads all JSON under `data/characters` and `data/settings` using `fs/promises`.
  - Validates each file with the shared Zod schemas; on any error, logs and exits process non-zero (fail-fast).
  - Uses `DATA_DIR` env var if provided, else `process.cwd()/data`.
- Server startup in `packages/api/src/server.ts` calls the loader before binding the port.
  - Keeps validated data in-memory for future endpoints and logs counts on startup.
- If you start the server, you will be unable to proceed because the terminal command will hang. Make sure you start the server in either a separate terminal, in the background, or in a monitoring mode.

## Developer Workflows

- Install and build everything:
  - `pnpm -w install`
  - `pnpm -w build` (Turbo orchestrates `tsc` builds; outputs to `dist/`)
- Typecheck and lint across packages:
  - `pnpm -w typecheck`
  - `pnpm -w lint`
- Run packages individually:
  - API (dev): `pnpm -F @minimal-rpg/api dev` (tsx watch)
  - API (prod): `pnpm -F @minimal-rpg/api build && pnpm -F @minimal-rpg/api start`
  - Web (dev): `pnpm -F @minimal-rpg/web dev`
- Data validation helper (optional): `node ./scripts/validate-data.js`

## Data & Schemas

- Add character files to `data/characters/*.json`; settings to `data/settings/*.json`.
- Must conform to schemas in `@minimal-rpg/schemas`. Minimums include non-empty strings for names and summaries; character `goals` is an array of non-empty strings; optional arrays: `tags`, `constraints`.
- Example validation usage:
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

- Use shared Zod schemas for all runtime validation; avoid duplicating type definitions.
- Keep imports ESM-correct with explicit `.js` for local paths due to `verbatimModuleSyntax`.
- API errors on invalid data should be explicit and fail-fast during startup (see `loader.ts`).
- Prefer small, self-contained JSON files; the loader treats missing directories as empty collections.

## Key Files

- Root: `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
- Schemas: `packages/schemas/src/index.ts`
- Shared: `packages/shared/src/index.ts` (re-exports from `@minimal-rpg/schemas`)
- API: `packages/api/src/data/loader.ts`, `packages/api/src/server.ts`
- Data: `data/README.md`, `data/characters/example.json`, `data/settings/example.json`

If anything here looks outdated or unclear (e.g., module import style or startup flow), tell me and I’ll adjust these instructions accordingly.
