# Minimal RPG

Monorepo for a minimal roleplaying chat app powered by advanced language models.

## What's New

**November 2025:** OpenRouter is now the default and required LLM path. Configure `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `packages/api/.env`. See `dev-docs/llm-recommendations.md` for model comparisons and `dev-docs/migration-guide.md` for migration instructions.
**Utilities:** The `deleteSettingFromDb(settingId, baseUrl?)` helper now lives in `@minimal-rpg/utils` and calls `DELETE /settings/:id`. Filesystem-backed settings return 405 and cannot be deleted.

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

- Applies PostgreSQL migrations via `@minimal-rpg/db db:migrate` and checks for port conflicts.
- Spawns the API/Web dev servers (detached) and polls `/health`, `/config`, `/characters`, and `/settings`.
- Checks LLM configuration (`llm.provider`, `llm.model`, and `llm.configured`).
- Adds a dev DB viewer at `GET /admin/db/overview` (see Web `/dbview`).

Optional: force a fresh DB (drop + migrate + seed) before startup:

```bash
CORE_RESET_DB=true pnpm core
```

This is destructive but handy if your local schema drifted or you want a clean slate.

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

## Database Setup

The app now uses PostgreSQL with the pgvector extension. Provide `DATABASE_URL` in `packages/api/.env` (see `.env.example`).

Create/update the database schema (idempotent):

```bash
pnpm -F @minimal-rpg/db db:migrate
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

Notes:

- Postgres data persists in the named `pgdata` volume. Run `docker compose down -v` (or `pnpm docker:down && docker volume rm minimal-rpg_pgdata`) if you want a clean database.
- The Postgres container is initialized with `POSTGRES_INITDB_ARGS=--locale=C` to avoid collation version mismatches when the base image updates. After pulling a new image, recreate the database volume once so the locale setting takes effect.

## Health

- `GET /health` returns `{ status, uptime, version, db, llm }`.
  - Checks Postgres connectivity and LLM configuration (`provider`, `model`, `configured`).

## API Endpoints (Overview)

Base URL defaults to `http://localhost:3001`.

- `GET /characters` — List available characters (id, name, summary, tags)
- `POST /characters` — Create a new dynamic character (body: CharacterProfile JSON). Persists to Postgres and is merged into subsequent `GET /characters` responses.
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

- Overrides are stored in Postgres tables (`character_instances`, `setting_instances`) keyed by `(sessionId, templateId)` with `overrides` and an auditable `baseline` JSON snapshot (captured on first write).
- The chat prompt uses the merged effective profiles (template + overrides). Arrays in overrides replace the template arrays; objects merge deeply.

## Schemas

- Source package: `@minimal-rpg/schemas` (in `packages/schemas`)
- Provides Zod schemas and types for characters and settings.
- Example usage:

```ts
import { CharacterProfileSchema, type CharacterProfile } from '@minimal-rpg/schemas';
const parsed = CharacterProfileSchema.parse(obj);
const character: CharacterProfile = parsed;
```

- Namespaced access is also available:

```ts
import { Character, Setting } from '@minimal-rpg/schemas';

// Character.* includes leaf schemas like AppearanceSchema, ScentSchema, etc.
const ok = Character.CharacterProfileSchema.safeParse(obj);
```

The package continues to export flat named types (`CharacterProfile`, `SettingProfile`, `Appearance`, ...), so existing imports remain valid.

Prefer importing directly from `@minimal-rpg/schemas`. The `@minimal-rpg/shared` package no longer exports these schemas.

Additional design & optimization details for character profile → prompt integration (including RAG roadmap) are documented in `dev-docs/character-profile-llm-integration.md`.

### API Types & Mappers

All route-facing API DTOs and LLM interfaces are centralized in `packages/api/src/types.ts`. Raw DB entities are never sent directly to clients.

Mapper functions in `packages/api/src/mappers/` translate DB/session entities into stable DTOs:

- `profileMappers.ts` → `CharacterSummary`, `SettingSummary`
- `sessionMappers.ts` → `SessionListItem`
- `messageMappers.ts` → `MessageResponse`

The OpenRouter provider exposes a normalized `LlmResponse` shape via `generateWithOpenRouter`, with provider-specific metadata namespaced (`openrouterMeta`). Adding a future provider only requires implementing the `LlmProvider` interface and returning `LlmResponse`.

Overrides logic uses typed `OverridesObject` and `OverridesAudit` to keep merging/auditing explicit.

- DB row helper types such as `CharacterTemplateRow`, `SettingTemplateRow`, and the per-session instance rows also live in `packages/api/src/types.ts` so routes can hydrate Prisma records without ad-hoc structural casts.

## Configuration

The API reads environment variables with sensible defaults for local development.

### Core Settings

- `PORT` (default: `3001`)
- `DATABASE_URL` (example: `postgres://postgres:postgres@localhost:5432/minirpg`)

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

- Visit `http://localhost:5173/dbview` to see a live overview of key tables, their fields, row counts, and the 50 most recent rows per table.
- Backed by `GET /admin/db/overview` which introspects Postgres metadata and queries sample rows.
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

See `dev-docs/web-architecture.md` for the web package structure, routing, components, hooks, API client, and data flow.

### Frontend Styling (Tailwind)

- The web UI uses Tailwind CSS with dark theme defaults and the Typography plugin.
- Edit theme tokens and variants in `packages/web/tailwind.config.js`.
- Global styles live in `packages/web/src/styles/app.css` and use `@tailwind base/components/utilities` plus a small custom scrollbar.
- Class names are embedded directly in components. No CSS Modules are used.

### Character Builder UI

- The web Character Builder now supports both free-text and structured appearance input. Use the toggle in the Appearance section to switch modes. Structured mode maps 1:1 to the `AppearanceSchema` (hair, eyes, height, torso, skinTone, arms/legs, features).
- Scent fields use selects constrained by the schema enums; `perfume` is limited to 40 chars.
- Client-side validation uses `CharacterProfileSchema.safeParse` before sending to the API. Invalid fields are reported inline on save.

### LLM Migration Notes

Legacy local Ollama support was removed; OpenRouter is now the sole provider. See:

- **Model Recommendations:** `dev-docs/llm-recommendations.md`
- **Migration Guide:** `dev-docs/migration-guide.md`

The OpenRouter adapter (`packages/api/src/llm/openrouter.ts`) is implemented and ready to use.

## Schema Change Checklist

When you add or change Zod schemas (for characters, settings, or prompt config), keep these pieces in sync:

- `packages/schemas/src` — Define/modify the Zod schema and ensure it is exported from the relevant barrel files (for characters: `character/*.ts` and `character/index.ts`, then `src/index.ts`).
- `data/characters/*.json`, `data/settings/*.json` — Update example JSON and any real data to satisfy the new schema requirements (run `node ./scripts/validate-data.js` to confirm).
- `packages/api/src/types.ts` — If API DTOs or `BuildPromptOptions` need new fields, add them here so routes and LLM code stay type-safe.
- `packages/api/src/llm/prompt.ts` — Update `serializeCharacter`, `serializeSetting`, and related helpers to surface new schema fields in the prompt (for example, new appearance or style facets).
- `packages/api/src/data/loader.ts` — Ensure the loader validates and surfaces any new schema-driven fields from JSON/DB into in-memory data.
- `packages/web/src` — Adjust UI components (e.g., Character Builder, Settings UI) and client-side validation to match the updated schemas.
- `dev-docs/*.md` — Update any docs that describe schemas or prompt wiring (notably `dev-docs/api-zod.md` and `dev-docs/character-profile-llm-integration.md`).

After making schema changes, run `pnpm check` and `node ./scripts/validate-data.js` to catch type or data validation issues early.

## Troubleshooting

### LLM Provider Issues

- **OpenRouter errors:**
  - Check your API key is valid at <https://openrouter.ai/keys>
  - Ensure you have credits at <https://openrouter.ai/credits>
  - Verify the model name is correct: <https://openrouter.ai/models>
- **"Missing LLM configuration" error:**
  - Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `packages/api/.env`.

### Other Issues

- **Messages endpoint returns 5xx when sending chat:**
  - Check `GET /health` — `llm.configured` must be `true` and `llm.model` should match your `.env`.
  - Ensure `packages/api/.env` defines `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` (server now always loads this file).
  - The web UI shows detailed errors from the API; if you see an OpenRouter error (e.g., auth/credit/model access), fix your key or model.
  - To see server logs in real time, run the API in a foreground terminal:

    ```bash
    pnpm -F @minimal-rpg/api dev
    ```

  - Common causes: invalid model name, insufficient credits, network egress blocked.

- **Database migration errors:**
  - Ensure `DATABASE_URL` is set (see `packages/api/.env.example`) and that your Postgres instance is reachable.
  - Run: `pnpm -F @minimal-rpg/db db:migrate`
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
