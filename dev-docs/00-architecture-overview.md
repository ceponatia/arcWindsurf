# Architecture Overview

This is the current, factual architecture based on the live code (not the archived drafts).

## Core Components

- Monorepo (pnpm + turbo) with key packages:
  - `@minimal-rpg/api` — Hono-based HTTP API.
  - `@minimal-rpg/web` — React 19 + Vite SPA (desktop + mobile layouts).
  - `@minimal-rpg/db` — Postgres access layer + migrations (pgvector enabled).
  - `@minimal-rpg/schemas` — Zod schemas/types for characters and settings.
  - `@minimal-rpg/utils` / `@minimal-rpg/ui` — shared helpers/UI primitives.
  - `@minimal-rpg/governor`, `@minimal-rpg/state-manager` — scaffolds only; not wired into runtime yet.

## Runtime Stack

- **API server**: `packages/api/src/server.ts`
  - Hono + `@hono/node-server`, CORS enabled for browser clients.
  - Loads prompt config (JSON files under `packages/api/src/llm/prompts`) and validates via schemas at startup.
  - Loads character/setting JSON from `data/` (or `DATA_DIR`) and keeps them in memory.
  - Registers route groups: `/config`, `/admin/db`, `/characters`, `/settings`, `/sessions` (+ overrides/messages).
  - LLM calls go through OpenRouter only (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, optional temperature/top_p).

- **Database**: PostgreSQL (pgvector extension enabled; vectors not yet used)
  - Tables (`packages/db/sql/001_init.sql`):
    - `user_sessions` — session metadata (template ids).
    - `messages` — ordered chat history (`idx` per session).
    - `character_instances` / `setting_instances` — per-session snapshots with `template_snapshot` + mutable `profile_json`.
    - `character_profiles` / `setting_profiles` — dynamic templates stored in DB (filesystem templates stay on disk).
  - Accessed via `@minimal-rpg/db` (pg Pool wrapper) exported as a Prisma-like client shape for the API.

- **Frontend**: `packages/web`
  - Entry `src/main.tsx` renders mobile or desktop shell; hash toggle for character builder (`#/character-builder`), `/dbview` path for admin DB viewer.
  - API base configured via `src/config.ts` (`VITE_API_BASE_URL`); dev proxy in `vite.config.ts`.
  - Panels: characters, settings, sessions, chat, character builder, optional `/dbview`.

- **Orchestration scripts**:
  - `pnpm core` / `pnpm core:quit` spin up/down API+Web, apply migrations, and health-check endpoints.
  - `docker compose up --build` runs API + Web + Postgres locally.

## Data & Schema Flow

- **Static content**: `data/characters/*.json`, `data/settings/*.json` validated at boot via `@minimal-rpg/schemas`.
- **Dynamic templates**: POST `/characters` or `/settings` persists to DB (`character_profiles`, `setting_profiles`). Filesystem templates remain immutable via API.
- **Session creation**: `POST /sessions` stores `user_sessions` row and clones baseline template JSON into `character_instances` and `setting_instances` (`template_snapshot`, `profile_json`).
- **Overrides**: PUT `/sessions/:id/overrides/{character|setting}` deep-merges overrides into `profile_json` (arrays replace). Effective profile = instance `profile_json`.
- **Messages**: `POST /sessions/:id/messages` appends user message, builds prompt, calls OpenRouter, stores assistant reply. Messages persisted in `messages` with incremental `idx`.

## Prompting & LLM Integration

- Prompt builder: `packages/api/src/llm/prompt.ts`
  - Serializes character + setting from effective profiles.
  - Summarizes older history (keep-last + compact recap) before sending to LLM.
  - Applies base system rules plus tag-specific rules (romance/adventure/mystery variants).
  - Simple content filter flagging certain user text before sending.
- OpenRouter adapter: `packages/api/src/llm/openrouter.ts` (OpenAI-compatible chat completions with retries/timeouts).
- No RAG/vector retrieval is wired in yet despite pgvector being enabled.

## Packages Not Yet in the Request Path

- `@minimal-rpg/governor` and `@minimal-rpg/state-manager` exist as scaffolds (logging echo-turns, naive JSON Patch helper) and are not invoked by the API or Web clients.
- No item/inventory system is implemented in code yet; related docs in `dev-docs/archive` are aspirational.

## Operational Notes

- Env: `.env` under `packages/api` (see `.env.example`) controls DB connection, OpenRouter model/key, LLM hyperparams, port.
- Health/config endpoints: `/health` and `/config` for runtime checks; `/admin/db/overview` for dev DB browser (guarded by env flags in API config).
- Frontend consumes `/characters`, `/settings`, `/sessions`, `/sessions/:id/messages`, and overrides endpoints; `/dbview` calls `/admin/db` routes.
