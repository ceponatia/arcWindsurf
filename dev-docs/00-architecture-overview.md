# Architecture Overview

This is the current, factual architecture based on the live code.

## Core Components

- Monorepo (pnpm + turbo) with key packages:
  - `@minimal-rpg/api` - Hono-based HTTP API.
  - `@minimal-rpg/web` - React 19 + Vite SPA (desktop + mobile layouts).
  - `@minimal-rpg/db` - Postgres access layer + migrations (pgvector enabled).
  - `@minimal-rpg/schemas` - Zod schemas/types for characters and settings.
  - `@minimal-rpg/utils` / `@minimal-rpg/ui` - shared helpers/UI primitives.
  - `@minimal-rpg/governor` - turn orchestration (intent detection, tool calling, agents, state patches).
  - `@minimal-rpg/state-manager` - baseline + overrides merging, JSON Patch application, slice registry.
  - `@minimal-rpg/agents` - domain agents (NPC, Sensory, Map, Rules, Parser).
  - `@minimal-rpg/retrieval` - in-memory knowledge node retrieval and scoring.

## Runtime Stack

### API Server (`packages/api/src/server.ts`)

- Hono + `@hono/node-server`, CORS enabled for browser clients.
- Loads prompt config (JSON files under `packages/api/src/llm/prompts`) and validates via schemas at startup.
- Loads character/setting JSON from `data/` (or `DATA_DIR`) and keeps them in memory.
- Route groups: `/config`, `/admin/db`, `/characters`, `/settings`, `/sessions`, `/sessions/:id/turns`.
- Governor-backed turns (`POST /sessions/:id/turns`) are the primary chat/runtime entry point. Each turn:
  - Records the user input as a message.
  - Loads per-session character and setting instances, overrides, and state slices.
  - Builds a structured `TurnStateContext` and passes it into the governor.
  - Persists state changes, overrides, NPC transcripts, and an audit log.
- LLM calls go through OpenRouter (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`) with tool calling support.
- Turn handler modes: `classic` (intent detection), `tool-calling` (LLM tools), or `hybrid` (configurable via `TURN_HANDLER` env).

### Database (PostgreSQL + pgvector)

Tables (`packages/db/sql/001_init.sql`):

- `user_sessions` - session metadata (template ids, labels, timestamps).
- `messages` - ordered chat history (`idx` per session).
- `npc_messages` - per-NPC transcripts for each session.
- `character_instances` / `setting_instances` - per-session snapshots with `template_snapshot`, mutable `profile_json`, and `overrides_json`.
- `character_profiles` / `setting_profiles` - dynamic templates stored in DB (filesystem templates stay on disk).
- `state_change_log` - per-turn audit entries capturing which agents ran and which slices changed.
- `session_location_state`, `session_inventory_state`, `session_time_state` - per-session slices for world position, inventory, and timeline.

Multi-NPC support:

- `character_instances` includes `role` (`primary` or `npc`) and an optional `label` for display.
- `GET /sessions/:id/npcs` exposes these instances to the client; `POST /sessions/:id/npcs` adds more.

Accessed via `@minimal-rpg/db` (pg Pool wrapper) exported as a Prisma-like client shape for the API.

### Frontend (`packages/web`)

- Entry `src/main.tsx` renders mobile or desktop shell.
- Hash routes for character builder (`#/character-builder`), `/dbview` path for admin DB viewer.
- API base configured via `src/config.ts` (`VITE_API_BASE_URL`); dev proxy in `vite.config.ts`.
- Panels: characters, settings, sessions, chat (backed by `/sessions/:id/turns`), character builder.

### Orchestration Scripts

- `pnpm core` / `pnpm core:quit` spin up/down API+Web, apply migrations, and health-check endpoints.
- `docker compose up --build` runs API + Web + Postgres locally.

## Data & Schema Flow

- **Static content**: `data/characters/*.json`, `data/settings/*.json` validated at boot via `@minimal-rpg/schemas`.
- **Dynamic templates**: POST `/characters` or `/settings` persists to DB (`character_profiles`, `setting_profiles`). Filesystem templates remain immutable via API.
- **Session creation**: `POST /sessions` stores `user_sessions` row and clones baseline template JSON into `character_instances` and `setting_instances` (`template_snapshot`, `profile_json`).
- **Overrides**:
  - PUT `/sessions/:id/overrides/{character|setting}` deep-merges overrides into `profile_json` (arrays replace) for simple flows.
  - Governor-backed turns compute **minimal overrides** (diff vs baseline) via `@minimal-rpg/state-manager` and persist them into `overrides_json` alongside the updated `profile_json`.
- **Messages & turns**:
  - `POST /sessions/:id/messages` remains as a more direct "prompt builder + LLM" endpoint.
  - `POST /sessions/:id/turns` is the canonical game loop endpoint.

### Profile Editing

Character `profile_json` is the canonical `JSONB` representation of the `CharacterProfile` schema. The web UI provides a structured character builder with fields for appearance, personality (Big Five sliders), body map sensory data, and details. On save, the builder validates against Zod schemas and persists to DB or filesystem.

## Prompting & LLM Integration

- **Prompt builder**: `packages/api/src/llm/prompts/`
  - Serializers for character and setting profiles.
  - History summarization for context window management.
  - Tag-specific rules (romance/adventure/mystery variants).
- **Tool calling**: `packages/governor/src/tools/`
  - Core tools: `get_sensory_detail`, `npc_dialogue`, `update_proximity`
  - Environment tools: `navigate_player`, `examine_object` (defined, handlers pending)
  - Relationship tools: `get_npc_memory`, `update_relationship` (defined, handlers pending)
  - `ToolExecutor` dispatches calls to appropriate agents/handlers.
- **OpenRouter adapter**: `packages/api/src/llm/openrouter.ts`
  - OpenAI-compatible chat completions with tool calling support.
  - Retries and timeouts for reliability.
- **RAG/vector retrieval**: Not yet wired; pgvector enabled for future use.

## Implementation Status

**Active in request path**:

- `@minimal-rpg/governor` - handles all `/sessions/:id/turns` requests.
- `@minimal-rpg/state-manager` - computes effective state and applies patches.
- `@minimal-rpg/agents` - NpcAgent and SensoryAgent invoked via tool calls.

**Defined but not fully wired**:

- Location persistence layer (schemas exist, no runtime integration).
- Item/inventory system (DB tables exist, no gameplay logic).
- NPC tier system, schedules, time advancement (brainstorm docs only).

## Operational Notes

- Env: `.env` under `packages/api` (see `.env.example`) controls DB connection, OpenRouter model/key, LLM hyperparams, port.
- Health/config endpoints: `/health` and `/config` for runtime checks; `/admin/db/overview` for dev DB browser (guarded by env flags in API config).
- Frontend consumes `/characters`, `/settings`, `/sessions`, `/sessions/:id/turns`, and overrides endpoints; `/dbview` calls `/admin/db` routes.
