# Minimal RPG

Minimal roleplaying chat app powered by advanced language models.

## 1. Quick Start (pnpm)

### Prerequisites

- Node.js 20+
- pnpm (Corepack is fine)
- OpenRouter account + API key

### Install + build

```bash
pnpm -w install
pnpm -w build
```

### Dev servers (manual)

```bash
# Terminal A
pnpm -F @minimal-rpg/api dev

# Terminal B
pnpm -F @minimal-rpg/web dev
```

- API: <http://localhost:3001>
- Web: <http://localhost:5173>
- Web chat: when a session has NPC instances, use the selector beside the input to target an NPC; leave it on Auto to use the primary/default.

Configure OpenRouter in `packages/api/.env` before starting (see `packages/api/.env.example`).

## 2. Quickstart (Docker)

### Run everything with Docker Compose

From the repo root:

```bash
docker compose up --build
```

This starts Postgres, the API, and the Web dev server on the same ports as the pnpm workflow:

- API: <http://localhost:3001>
- Web: <http://localhost:5173>

Stop containers with `Ctrl+C`, or in another shell:

```bash
docker compose down
```

### When do I need `--build`?

The `Dockerfile.dev` bakes in the dependency install step, but the source code is mounted as a volume (`.:/app`), so most edits do not require a rebuild.

Use **`--build` (or `docker compose build`) when**:

- You change `package.json`, `pnpm-lock.yaml`, or `pnpm-workspace.yaml`
- You add/remove packages or change their `package.json` files
- You change Docker-related files (`Dockerfile.dev`, `docker-compose.yml`)

You **do not need to rebuild** when:

- Editing TypeScript/JS/TSX files in any package
- Changing JSON data under `data/` (characters, settings, etc.)
- Tweaking `.env` files used at runtime (restart containers instead)

For non-build changes, a simple restart is enough:

```bash
docker compose down
docker compose up
```

## 3. Unified Dev Workflow

Use the core script to prep the DB, start both servers, and verify health in one step:

```bash
pnpm core
```

What it does:

- Runs PostgreSQL migrations via `@minimal-rpg/db db:migrate`
- Starts API + Web dev servers (detached)
- Polls `/health`, `/config`, `/characters`, `/settings`
- Verifies LLM configuration (provider, model, configured flag)

Force a clean DB (drop + migrate + seed):

```bash
CORE_RESET_DB=true pnpm core
```

Stop all dev services and free ports 3001/5173:

```bash
pnpm core:quit
```

### Test Scripts

**Tool calling test**: Test LLM function calling with RPG tools:

```bash
npx tsx scripts/test-tool-calling.ts                   # Default test prompts
npx tsx scripts/test-tool-calling.ts --verbose         # Show API details
npx tsx scripts/test-tool-calling.ts --prompt "..."    # Custom prompt
```

**Personality test**: Test LLM responses to personality traits:

```bash
pnpm test:trait -- --trait "quiet, introverted, empathetic"
```

---

## 4. Database & Docker

### Database setup

- Requires PostgreSQL with pgvector
- Set `DATABASE_URL` in `packages/api/.env`

Apply / update schema:

```bash
pnpm -F @minimal-rpg/db db:migrate
```

### Docker Compose (dev)

Run API + Web in containers:

```bash
docker compose up --build
```

Defaults:

- API: <http://localhost:3001>
- Web: <http://localhost:5173>
- Frontend API base: `VITE_API_BASE_URL=http://localhost:3001`

Postgres data lives in the `pgdata` volume. Use `docker compose down -v` if you want a fresh DB.

---

## 5. API Overview

Base URL: <http://localhost:3001>

- `GET /characters` – list characters (id, name, summary, tags)
- `POST /characters` – create character (body: CharacterProfile JSON)
- `GET /sessions` – list sessions (most recent first)
- `POST /sessions` – create session `{ characterId, settingId }`
- `GET /sessions/:id/npcs` – list per-session character/NPC instances with role/label/name
- `POST /sessions/:id/npcs` – create an additional per-session NPC instance from a character template `{ templateId, role?, label? }` (role defaults to `npc` and only one `primary` is allowed)
- `GET /sessions/:id` – session details + messages
- `POST /sessions/:id/messages` – send message `{ content }`
- `POST /sessions/:id/turns` – governor-backed turn endpoint `{ input, npcId? }` that persists state slices, resolves the active NPC, and writes per-NPC transcripts
- `PUT /sessions/:id/overrides/character` – upsert character overrides (**deprecated**: bypasses state manager)
- `PUT /sessions/:id/overrides/setting` – upsert setting overrides (**deprecated**: bypasses state manager)
- `GET /health` – health and reachability
- `GET /config` – effective runtime config (no secrets)

Characters and settings come from JSON files under `data/characters` and `data/settings`. The server validates these on startup and fails fast on invalid data.

Per-session overrides mutate the `character_instances` and `setting_instances` snapshots; arrays replace, objects merge deeply before persisting.

---

## 6. Schemas & Packages

### Schema package

`@minimal-rpg/schemas` provides Zod schemas and types for characters, settings, personas, locations, and inventory. Import directly: `CharacterProfileSchema`, `InventoryStateSchema`, `BuiltLocationSchema`, etc.

### Persona System

Player character profiles with identity and appearance (no personality fields since players control their own actions).

- **API**: `/personas` endpoints (CRUD)
- **Database**: `persona_profiles` table
- **Governor**: Persona passed via `TurnInput.persona` for personalized NPC responses
- **Web UI**: Builder and panel in `packages/web/src/features/persona-*`

### Monorepo packages

- `@minimal-rpg/api` – Hono-based HTTP server with session state services (loader, persister, cache)
- `@minimal-rpg/web` – React + Vite SPA
- `@minimal-rpg/db` – PostgreSQL + pgvector + migrations
- `@minimal-rpg/schemas` – Zod schemas for domain types + proximity state
- `@minimal-rpg/governor` – Turn orchestration (intent → agents → response) with tool-based state patches
- `@minimal-rpg/state-manager` – Extensible state slices + tool-aware JSON Patch
- `@minimal-rpg/agents` – Map, NPC, Sensory, Rules agents with proximity slice support
- `@minimal-rpg/retrieval` – Knowledge node retrieval/scoring
- `@minimal-rpg/generator` – Random character generation
- `@minimal-rpg/utils` – Shared utilities
- `@minimal-rpg/ui` – Shared UI components

See [dev-docs/00-architecture-overview.md](dev-docs/00-architecture-overview.md) for architecture details.

**Brainstorm documents** (status: design/research):

- [26-time-system.md](dev-docs/26-time-system.md) – Game time tracking and configuration
- [27-npc-schedules-and-routines.md](dev-docs/27-npc-schedules-and-routines.md) – Background NPC behavior
- [28-affinity-and-relationship-dynamics.md](dev-docs/28-affinity-and-relationship-dynamics.md) – Multi-dimensional relationship tracking
- [29-time-triggered-behaviors.md](dev-docs/29-time-triggered-behaviors.md) – Time-aware NPC responses

---

## 7. Configuration

### Core env vars

- `PORT` (default `3001`)
- `DATABASE_URL` – Postgres connection string

### LLM (OpenRouter)

- `OPENROUTER_API_KEY` – from <https://openrouter.ai/keys>
- `OPENROUTER_MODEL` – e.g. `deepseek/deepseek-chat-v3-0324`

### Frontend (Vite)

- `VITE_API_BASE_URL` (default `http://localhost:3001`)
- `VITE_API_MESSAGE_TIMEOUT_MS` (default `60000`)
- `VITE_STRICT_MODE` (default `false`)

Additional details live in `dev-docs/` (LLM recommendations, migration guide, web architecture).

---

## 8. Dev Tools & Troubleshooting

### Dev DB viewer

- Enable server flag `ADMIN_DB_TOOLS=true` (API) and `VITE_DB_TOOLS=true` (Web)
- Visit <http://localhost:5173/dbview> for table metadata + recent rows

### Common issues

- Messages endpoint 5xx
  - Check `GET /health` – `llm.configured` must be `true`
  - Ensure `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are set in `packages/api/.env`
- DB migration errors
  - Verify `DATABASE_URL` and Postgres reachability
  - Re-run: `pnpm -F @minimal-rpg/db db:migrate`
- `pnpm core` "hangs"
  - It keeps dev servers running by design
  - If the API exits, start it alone (`pnpm -F @minimal-rpg/api dev`) to see validation errors

Run `pnpm check` and `node ./scripts/validate-data.js` after schema or data changes to catch issues early.

---

## 9. Key Features

### Character System

- **Body Map**: 33 anatomical regions with per-region sensory data (scent, texture, visual, flavor)
- **Personality Map**: Big Five dimensions, emotional baseline, values, fears, attachment style, social patterns, speech style
- **Flexible Details**: Label/value entries with area, importance, tags
- **Gender Field**: Optional gender with context-aware body regions in UI
- **Random Generation**: Themed character generator with "Fill Missing Fields" button

### Intent & Interaction

- **Compound Intents**: Asterisk rule for parsing mixed speech/action/thought/sensory input
- **Sensory Agents**: Body region resolution for natural language queries (e.g., "her hair" → hair region)
- **Multi-Action Processing**: Enhanced NPC responses for action sequences with temporal ordering
- **Tool-Based Turn Handler**: LLM intelligently decides when to call tools based on context
  - Replaces brittle rule-based intent detection
  - Supports `'classic'`, `'tool-calling'`, or `'hybrid'` modes via `GovernorOptions.turnHandler`
  - The LLM understands: "He looks at Taylor's face" (sensory) vs "He looks up hopefully" (narrative)

### Session Management

- **Immutable Templates**: Character/setting templates + per-session snapshots with overrides
- **Per-NPC Transcripts**: Separate conversation history for each NPC
- **State Persistence**: Location, inventory, time slices in dedicated tables
- **Speaker Metadata**: NPC avatars and names persist in messages

### UI & Documentation

- **In-App Docs**: MDX-based docs with navigation, syntax highlighting (`#/docs`)
- **Character Builder**: Dynamic entry-based UI for appearance and body sensory data
- **Persona Builder**: Player character profiles (identity + appearance)
- **Tags System**: Categories, activation modes, trigger conditions, live preview
- **Mobile-Optimized**: Responsive AppShell layout

### Technical

- **OpenRouter**: Sole LLM provider (DeepSeek V3 recommended)
- **PostgreSQL + pgvector**: Embeddings and retrieval
- **Governor Architecture**: Turn orchestration with agent routing and state patches
- **LLM Efficiency**: SensoryAgent provides data, NpcAgent writes prose (1 LLM call vs 2-3)
