# Minimal RPG (ArcAgentic)

A monorepo for a roleplaying chat app with a Hono API server, a React/Vite web UI, and supporting packages for schemas, persistence, LLM providers, and game services.

This README focuses on what is true in this repository today (scripts, ports, and where to look for implementation details). For deeper design/roadmap docs, see the files under `dev-docs/`.

## 1. Quick start (Docker)

Docker Compose is the quickest way to run all required infrastructure (Postgres + Redis) and the dev servers.

### Prerequisites

- Docker and Docker Compose
- An OpenRouter API key (recommended), or a local Ollama setup

### Configure environment

Copy the example env file and set at least `OPENROUTER_API_KEY` (or configure Ollama):

```bash
cp .env.example .env
```

### Start everything

From the repo root:

```bash
docker compose --env-file .env -f config/docker/docker-compose.yml up --build
```

Services:

- Web: <http://localhost:${WEB_PORT:-5173}>
- API: <http://localhost:${API_PORT:-3001}>
- Postgres: `localhost:${PG_PORT:-5433}`
- Redis: `localhost:6379`

Stop containers:

```bash
docker compose -f config/docker/docker-compose.yml down
```

Wipe the dev database volume:

```bash
docker compose -f config/docker/docker-compose.yml down -v
```

## 2. Quick start (local dev with pnpm)

### Prerequisites

- Node.js 20+
- pnpm
- Postgres 16+ (pgvector) and Redis 7+ (Docker is fine)

### Install and build

```bash
cp .env.example .env
pnpm -w install
pnpm -w build
```

### Start infrastructure (db + redis)

If you do not already have Postgres + Redis running locally:

```bash
pnpm infra:up
```

### Run dev servers

Run API + Web via Turbo:

```bash
pnpm dev
```

Or run them individually:

```bash
pnpm -F @minimal-rpg/api dev
pnpm -F @minimal-rpg/web dev
```

Defaults:

- API: <http://localhost:3001>
- Web: <http://localhost:5173>

If a port is already in use:

```bash
pnpm dev:kill
```

## 3. Scripts

Core scripts (repo root):

- `pnpm build`: Build all packages (Turbo)
- `pnpm dev`: Run dev servers (Turbo)
- `pnpm lint`: Lint all packages (Turbo)
- `pnpm test`: Run tests across the monorepo (Turbo)
- `pnpm typecheck`: Typecheck all packages (Turbo)
- `pnpm dev:kill`: Kill listeners on ports 3001 and 5173 (uses `lsof` or `fuser`)

Infrastructure and DB:

- `pnpm infra:up`: Start Postgres + Redis via Docker Compose (detached)
- `pnpm infra:down`: Stop Postgres + Redis containers
- `pnpm docker:up`: Start all services (db + redis + api + web)
- `pnpm docker:build`: Start all services with rebuild
- `pnpm docker:down`: Stop and remove containers
- `pnpm db:migrate`: Apply migrations
- `pnpm db:migrate:fresh`: Drop and re-apply migrations

Note: the root scripts run Turbo through `scripts/turbo.mjs` to make pnpm resolution robust when Turbo executes tasks from package subdirectories.

## 4. Tests

Run all tests:

```bash
pnpm test
```

Run a single package:

```bash
pnpm -F @minimal-rpg/api test
pnpm -F @minimal-rpg/web test
pnpm -F @minimal-rpg/llm test
```

Streaming smoke test (SSE and provider streaming):

```bash
node scripts/test-streaming.mjs --target=studio --message "Generate a short NPC greeting." --apiBaseUrl http://localhost:3001
node scripts/test-streaming.mjs --target=openai --message "Say hello in one sentence."
```

## 5. Database and environment

- Postgres 16+ with pgvector is the expected DB engine.
- Redis is used by the bus and caches; Docker Compose includes it by default.
- The repo uses a single repo-root `.env` file. The API loads it on startup; Vite is configured with `envDir` to load it from the repo root.

Apply migrations:

```bash
pnpm db:migrate
```

## 6. Packages

Packages live under `packages/`:

- `@minimal-rpg/api`: Hono HTTP server (routes, auth, validation)
- `@minimal-rpg/web`: React + Vite SPA
- `@minimal-rpg/db`: Drizzle ORM + migrations + repositories
- `@minimal-rpg/schemas`: Zod schemas and shared types (contracts)
- `@minimal-rpg/llm`: LLM provider adapters (OpenRouter/OpenAI-style + Ollama)
- `@minimal-rpg/bus`: World event bus (Redis pub/sub adapter)
- `@minimal-rpg/services`: Domain services used by turns
- `@minimal-rpg/actors`: Runtime actor logic
- `@minimal-rpg/projections`: Read models and projections
- `@minimal-rpg/retrieval`: Retrieval/scoring utilities
- `@minimal-rpg/characters`: Character-related helpers
- `@minimal-rpg/generator`: Content generation utilities
- `@minimal-rpg/utils`: Shared utilities
- `@minimal-rpg/ui`: Shared UI components
- `@minimal-rpg/workers`: Background workers

For a recent package breakdown and dependency layering, see `dev-docs/inventory.md`.

## 7. API overview

Base URL (dev): <http://localhost:3001>

The API is organized by route registrars in `packages/api/src/routes/`. A few commonly used endpoints:

- `GET /health`: health status (including LLM/provider reachability)
- `GET /system/config`: effective runtime config (no secrets)
- `GET /characters`, `GET /settings`: list profiles (filesystem + DB)
- `GET /sessions`: session management
- `POST /game/turns`: turn processing
- `POST /studio/generate/stream`: server-sent events streaming

Note on profiles: if a `data/` folder exists (for example `data/characters/*.json` and `data/settings/*.json` at the repo root), those profiles are loaded and validated at API startup. DB-backed profiles are also supported.

## 8. Configuration

See `.env.example` for the full list; commonly edited values include:

```dotenv
# LLM
OPENROUTER_API_KEY=
OPENROUTER_MODEL=

# Local Ollama (optional)
OLLAMA_BASE_URL=
OLLAMA_MODEL=

# DB and ports
DB_TARGET=local
DATABASE_URL_LOCAL=postgres://postgres:postgres@localhost:5432/minirpg
PG_PORT=5433
API_PORT=3001
WEB_PORT=5173
PORT=3001

# Redis
REDIS_URL=redis://localhost:6379
```

## 9. Troubleshooting

- If the API fails on startup, ensure Postgres and Redis are reachable (run `pnpm infra:up`).
- If the web UI loads but API calls fail, confirm `VITE_API_BASE_URL` (defaults to `http://localhost:3001`) and check `GET /health`.
- If ports are stuck, run `pnpm dev:kill`.

## 10. Documentation

- In-app docs are authored as MDX under `packages/web/src/docs/` and are reachable in the UI at `#/docs`.
- Developer notes and plans live under `dev-docs/`.
