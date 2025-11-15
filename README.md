# Minimal RPG

Monorepo for a minimal roleplaying chat app powered by advanced language models.

## What's New

**November 2025:** OpenRouter is now the default and required LLM path. Configure `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `packages/api/.env`. See `dev-docs/llm-recommendations.md` for model comparisons and `dev-docs/migration-guide.md` for migration instructions.

## Quick Start

Prerequisites:

- Node.js 20+
- pnpm (Corepack is fine)
- **LLM Provider:** OpenRouter account with API key (see Configuration)

Install dependencies and build everything:

```bash
pnpm -w install
pnpm -w build
```

Start the API and Web apps in separate terminals:

```bash
# Terminal A
pnpm -F @minimal-rpg/api dev

# Terminal B
pnpm -F @minimal-rpg/web dev
```

- API will listen on `http://localhost:3001`
- Web (Vite dev) will listen on `http://localhost:5173`
- Configure your LLM provider (OpenRouter) in `packages/api/.env` before starting
  - See the Configuration section below for details

### Unified startup/teardown

Use the orchestration scripts to prep the database, start both servers, and verify health:

```bash
pnpm core
```

- Applies Prisma migrations via `db:deploy`, seeds demo data, and checks for port conflicts.
- Spawns the API/Web dev servers (detached) and polls `/health`, `/config`, `/characters`, and `/settings`.
- Checks LLM configuration (`llm.provider`, `llm.model`, and `llm.configured`).
- Adds a dev DB viewer at `GET /admin/db/overview` (see Web `/dbview`).

When finished, stop everything and free the ports:

```bash
pnpm core:quit
```

- Sends SIGTERM/SIGKILL to tracked services and forcibly clears any processes bound to ports 3001/5173.
- If ports remain busy after automated cleanup, the script highlights them so you can investigate manually.

## Run Locally

Install and build everything:

```bash
pnpm -w install
pnpm -w build
```

Start API (dev):

```bash
pnpm -F @minimal-rpg/api dev
```

Start Web (dev):

```bash
pnpm -F @minimal-rpg/web dev
```

## Database Setup & Seeding

The API stores sessions in a local SQLite DB via Prisma. If you run the dev server without a migration, it will generate a database for you when you run the migration commands below.

Create the database schema (one-time per environment):

```bash
DATABASE_URL=file:./prisma/dev.db pnpm -F @minimal-rpg/api db:migrate
```

Seed a demo session (idempotent; safe to re-run):

```bash
pnpm -F @minimal-rpg/api db:seed
```

## Docker Compose (Dev)

Run API and Web together in containers:

```bash
docker compose up --build
```

Defaults:

- API: `http://localhost:3001`
- Web (Vite dev): `http://localhost:5173`

To change model/runtime params, set env vars (see `packages/api/.env.example`).

## Health

- `GET /health` returns `{ status, uptime, version, db, llm }`.
  - Checks SQLite connectivity and LLM configuration (`provider`, `model`, `configured`).

## API Endpoints (Overview)

Base URL defaults to `http://localhost:3001`.

- `GET /characters` — List available characters (id, name, summary, tags)
- `GET /settings` — List available settings (id, name, tone)
- `GET /sessions` — List existing sessions (most recent first, includes character/setting names)
- `POST /sessions` — Create a chat session
  - Body: `{ "characterId": string, "settingId": string }`
  - Returns: `{ id, characterId, settingId, createdAt }`
- `GET /sessions/:id` — Get session details and messages
- `POST /sessions/:id/messages` — Send a message
  - Body: `{ "content": string }`
  - Returns: `{ message }` (the assistant reply)
- `GET /sessions/:id/effective` — Get effective merged `character` and `setting` for the session (template + overrides)
- `PUT /sessions/:id/overrides/character` — Upsert character overrides for the session
  - Body: JSON object with partial fields to override (arrays replace)
  - Audited: persists a baseline JSON snapshot of the template on first write
- `PUT /sessions/:id/overrides/setting` — Upsert setting overrides for the session
  - Body: JSON object with partial fields to override (arrays replace)
  - Audited: persists a baseline JSON snapshot of the template on first write
- `GET /health` — Health and reachability
- `GET /config` — Effective runtime configuration (no secrets)

Tip: Characters and settings are defined in JSON files under `data/characters` and `data/settings`. The server validates these on startup.

### Per-Session Overrides

- Overrides are stored in SQLite (Prisma models: `CharacterInstance`, `SettingInstance`) keyed by `(sessionId, templateId)` with `overrides` and an auditable `baseline` JSON snapshot (captured on first write).
- The chat prompt uses the merged effective profiles (template + overrides). Arrays in overrides replace the template arrays; objects merge deeply.

## Schemas

- Source package: `@minimal-rpg/schemas` (in `packages/schemas`)
- Provides Zod schemas and types for characters and settings.
- Example usage:

```ts
import { CharacterProfileSchema, type CharacterProfile } from '@minimal-rpg/schemas'
const parsed = CharacterProfileSchema.parse(obj)
const character: CharacterProfile = parsed
```

- Namespaced access is also available:

```ts
import { Character, Setting } from '@minimal-rpg/schemas'

// Character.* includes leaf schemas like AppearanceSchema, ScentSchema, etc.
const ok = Character.CharacterProfileSchema.safeParse(obj)
```

The package continues to export flat named types (`CharacterProfile`, `SettingProfile`, `Appearance`, ...), so existing imports remain valid.

Prefer importing directly from `@minimal-rpg/schemas`. The `@minimal-rpg/shared` package no longer exports these schemas.

## Configuration

The API reads environment variables with sensible defaults for local development.

### Core Settings

- `PORT` (default: `3001`)
- `DATABASE_URL` (default: `file:./prisma/dev.db` inside the API package)

### LLM Configuration

- `OPENROUTER_API_KEY` — Your OpenRouter API key from <https://openrouter.ai/keys>
- `OPENROUTER_MODEL` — Model to use (e.g., `deepseek/deepseek-chat-v3-0324`)
- See `dev-docs/llm-recommendations.md` for detailed model comparisons and recommendations.

### Prompts

- System prompts are now managed as JSON files under `packages/api/src/llm/prompts/`:
  - `system-prompt.json` — core narration rules
  - `safety-rules.json` — safety and boundaries
  - `safety-mode.json` — safety-mode directive and sensitive note
- The API loads these at startup via ESM JSON imports; edit them to adjust guide behavior without code changes.

### Dev Database Viewer

- Visit `http://localhost:5173/dbview` to see a live overview of all Prisma models/tables, their fields, row counts, and the 50 most recent rows per table.
- Backed by `GET /admin/db/overview` which introspects Prisma's DMMF and queries sample rows.
- For development use only; do not expose this endpoint in production.

#### Row Deletion (Dev-only)

- Enable server-side admin tools by setting `ADMIN_DB_TOOLS=true` in `packages/api/.env`.
- Enable the UI controls by setting `VITE_DB_TOOLS=true` for the web app.
- When both are enabled, `/dbview` shows a Delete action per row. Clicking Delete calls `DELETE /admin/db/:model/:id` and refreshes the table.
- The API only supports deletion for models with a single `id` primary key and returns `204` on success.

### Generation Parameters

- `CONTEXT_WINDOW` (default: `12`) — how many recent turns to include
- `TEMPERATURE` (default: `0.7`) — generation temperature (0.0-1.0)
- `TOP_P` (default: `0.9`) — nucleus sampling parameter
- Frontend message timeout: set `VITE_API_MESSAGE_TIMEOUT_MS` (default `60000`) to allow longer-running model responses. The previous 10s default could abort messages mid-generation.

### Frontend (Vite) Settings

- `VITE_API_BASE_URL` (default: `http://localhost:3001`)
- `VITE_API_MESSAGE_TIMEOUT_MS` (default: `60000`)
- `VITE_STRICT_MODE` (default: `false`) — when `true`, renders `React.StrictMode` in dev which double-invokes effects. Leave `false` to avoid duplicate fetches/cancellations during development.

Example env file: `packages/api/.env.example`

### Migrating from Ollama to Cloud LLMs

For a complete guide on migrating from local Ollama to cloud-hosted LLMs (OpenRouter), see:

- **Model Recommendations:** `dev-docs/llm-recommendations.md`
- **Migration Guide:** `dev-docs/migration-guide.md`

The OpenRouter adapter (`packages/api/src/llm/openrouter.ts`) is already implemented and ready to use.

## Troubleshooting

### LLM Provider Issues

- **OpenRouter errors:**
  - Check your API key is valid at <https://openrouter.ai/keys>
  - Ensure you have credits at <https://openrouter.ai/credits>
  - Verify the model name is correct: <https://openrouter.ai/models>
- **"Missing LLM configuration" error:**
  - Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `packages/api/.env`.

### Other Issues

- **Database migration errors:**
  - Ensure `DATABASE_URL` is set or use the example migrate command shown above.
- **Markdown formatting checks failing:**
  - Run `pnpm run lint:md` to see markdown issues and fix indentation/tabs.
- **Characters or settings show "Loading…" or many canceled requests:**
  - In dev, React Strict Mode double-invokes effects, often aborting the first fetch. We disable Strict Mode by default via `VITE_STRICT_MODE=false`.
  - If you prefer Strict Mode, set `VITE_STRICT_MODE=true`; the duplicate (canceled) requests are expected during development but harmless.
  - Confirm the API base URL and check the browser console for any real network errors.
- **`pnpm core` appears to hang, and the Web UI shows no characters/settings:**
  - `pnpm core` intentionally keeps the API and Web dev servers running; it will not exit on success.
  - If the API exits immediately, the Web dev server will still run and the UI will have no data. Start the API alone to see validation errors:

    ```bash
    pnpm -F @minimal-rpg/api dev
    ```

  - The API fails fast when data JSON violates the Zod schemas (e.g., `appearance.build` must be one of `slight|average|athletic|heavy`, `style.formality` must be `casual|neutral|formal`). Fix the offending file and restart.
