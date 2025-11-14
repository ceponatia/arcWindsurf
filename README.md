# Minimal RPG

Monorepo for a minimal roleplaying chat app powered by advanced language models.

## What's New

**November 2024:** Added support for cloud-hosted LLMs via OpenRouter, enabling access to powerful models like Claude 3.5 Sonnet, Mistral Large 2, and more. See `dev-docs/llm-recommendations.md` for model comparisons and `dev-docs/migration-guide.md` for migration instructions.

## Quick Start

Prerequisites:

- Node.js 20+
- pnpm (Corepack is fine)
- **LLM Provider (choose one):**
  - **Recommended:** OpenRouter account with API key (cloud-hosted, see Configuration section)
  - **Alternative:** Ollama running locally with a suitable model (e.g., `mistral:instruct`)

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
- Configure your LLM provider (OpenRouter or Ollama) in `packages/api/.env` before starting
  - See the Configuration section below for details

### Unified startup/teardown

Use the orchestration scripts to prep the database, start both servers, and verify health:

```bash
pnpm core
```

- Applies Prisma migrations via `db:deploy`, seeds demo data, and checks for port conflicts.
- Spawns the API/Web dev servers (detached) and polls `/health`, `/config`, `/characters`, and `/settings`.
- Checks LLM provider connectivity (OpenRouter or Ollama, depending on configuration).

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
- Ollama endpoint: `http://localhost:11434` (or host-specific)

To change model/runtime params, set env vars (see `packages/api/.env.example`).

## Health

- `GET /health` returns `{ status, uptime, version, db, ollama }`.
  - Checks SQLite connectivity and Ollama reachability.

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
- `GET /health` — Health and reachability
- `GET /config` — Effective runtime configuration (no secrets)

Tip: Characters and settings are defined in JSON files under `data/characters` and `data/settings`. The server validates these on startup.

## Configuration

The API reads environment variables with sensible defaults for local development.

### Core Settings

- `PORT` (default: `3001`)
- `DATABASE_URL` (default: `file:./prisma/dev.db` inside the API package)

### LLM Configuration (choose one)

**Cloud-hosted (recommended for production):**

- `OPENROUTER_API_KEY` — Your OpenRouter API key from <https://openrouter.ai/keys>
- `OPENROUTER_MODEL` — Model to use (e.g., `mistralai/mistral-large-2411`, `anthropic/claude-3.5-sonnet`)
- See `dev-docs/llm-recommendations.md` for detailed model comparisons and recommendations

**Local development (requires Ollama):**

- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (e.g., `mistral:instruct`)

Note: The application supports both Ollama (local) and OpenRouter (cloud) simultaneously. If both are configured, OpenRouter takes precedence.

### Generation Parameters

- `CONTEXT_WINDOW` (default: `12`) — how many recent turns to include
- `TEMPERATURE` (default: `0.7`) — generation temperature (0.0-1.0)
- `TOP_P` (default: `0.9`) — nucleus sampling parameter
- Frontend message timeout: set `VITE_API_MESSAGE_TIMEOUT_MS` (default `60000`) to allow longer-running model responses. The previous 10s default could abort messages mid-generation.

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
- **Ollama not detected in `/health`:**
  - Ensure Ollama is running and `OLLAMA_BASE_URL` points to it (default: `http://localhost:11434`).
  - Make sure the model in `OLLAMA_MODEL` is pulled (e.g., `ollama pull mistral:instruct`).
- **"Missing LLM configuration" error:**
  - Set either `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` or `OLLAMA_MODEL` in your `.env` file

### Other Issues

- **Database migration errors:**
  - Ensure `DATABASE_URL` is set or use the example migrate command shown above.
- **Markdown formatting checks failing:**
  - Run `pnpm run lint:md` to see markdown issues and fix indentation/tabs.
- **Characters or settings show "Loading…" indefinitely in the UI:**
  - This was previously caused by React Strict Mode aborting the initial fetch before completion while the hook incorrectly marked it as fetched.
  - Hooks now only mark data as fetched after a successful load (or explicit error), allowing a second Strict Mode mount to complete normally.
  - If it reoccurs, confirm the API is reachable at `VITE_API_BASE_URL` (default `http://localhost:3001`) and check the browser console for network aborts.
  - Use `pnpm core` to start both servers with health checks if unsure which service is down.
