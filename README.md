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

### Trait testing CLI (LLM personality experiments)

Run a small, standalone CLI to probe how the LLM responds to specific personality phrasings. This does not touch the DB or main app:

```bash
OPENROUTER_API_KEY=sk-... pnpm test:trait -- --trait "quiet, highly introverted, conflict-avoidant but deeply empathetic"
```

Flags:

- `--trait` – personality phrase(s) to emphasize (optional; a default introverted profile is used if omitted)
- `--scenario` – custom test scene text (optional)
- `--model` – override `OPENROUTER_MODEL` (defaults to `deepseek/deepseek-chat`)
- `--dimensions` – comma-separated Big Five scores (e.g. `"openness=0.8,extraversion=0.1"`)

If `--dimensions` is provided, the script uses the same slider → temperament mapping as the NPC agent to derive a trait prompt (you can still override it with `--trait`). It then prints the trait, scenario, model, any parsed dimensions, and the raw model response so you can judge how clearly the personality comes through.

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
- `PUT /sessions/:id/overrides/character` – upsert character overrides
- `PUT /sessions/:id/overrides/setting` – upsert setting overrides
- `GET /health` – health and reachability
- `GET /config` – effective runtime config (no secrets)

Characters and settings come from JSON files under `data/characters` and `data/settings`. The server validates these on startup and fails fast on invalid data.

Per-session overrides mutate the `character_instances` and `setting_instances` snapshots; arrays replace, objects merge deeply before persisting.

---

## 6. Schemas & Packages

### Schema package

- `@minimal-rpg/schemas` (in `packages/schemas`)
- Zod schemas and types for characters, settings, locations, and inventory slices

Example:

```ts
import {
  CharacterProfileSchema,
  InventoryStateSchema,
  BuiltLocationSchema,
} from '@minimal-rpg/schemas';

const character = CharacterProfileSchema.parse(obj.character);
const location = BuiltLocationSchema.parse(obj.location);
const inventory = InventoryStateSchema.parse(obj.inventory);
```

Namespaced access (e.g. `Character.CharacterProfileSchema`) is also available. Prefer importing directly from `@minimal-rpg/schemas`.

### Monorepo packages

- `@minimal-rpg/api` – Hono-based HTTP API server
- `@minimal-rpg/web` – React + Vite SPA client
- `@minimal-rpg/db` – PostgreSQL access layer + migrations (pgvector)
- `@minimal-rpg/schemas` – Zod schemas/types for core domain
- `@minimal-rpg/utils` – shared runtime utilities
- `@minimal-rpg/ui` – shared UI primitives
- `@minimal-rpg/governor` – turn orchestration (intent → agents → patches → response)
- `@minimal-rpg/state-manager` – baseline + overrides merging and JSON Patch
- `@minimal-rpg/agents` – specialized agents (Map, NPC, Rules, Parser, Sensory)
- `@minimal-rpg/retrieval` – in-memory knowledge node retrieval and scoring used by the governor

For a deeper architecture walkthrough (DB schema, governor-backed turn flow, and how slices/overrides fit together), see [dev-docs/00-architecture-overview.md](dev-docs/00-architecture-overview.md).

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

## 9. Recent Highlights

- Location and inventory slices validate via `BuiltLocationSchema` and `InventoryStateSchema` before persisting overrides.
- Character profiles support flexible `details` entries (label/value with area, importance, tags) which feed directly into prompts.
- Character profiles now support an optional `body` map with per-region sensory data (scent, texture, visual). Body regions include: head, face, hair, neck, shoulders, torso, chest, back, arms, hands, waist, hips, legs, feet.
- Body region aliases include equipment references (e.g., "shoes" → feet, "gloves" → hands, "hat" → head) so natural language queries about clothing resolve to the correct body region.
- Equipment slot mapping (body region → clothing slots) is handled by `@minimal-rpg/governor`'s `resolveBodyWithEquipment()`, keeping character schemas decoupled from item schemas.
- Character builder (web) uses the BodyMap schema exclusively for sensory data. Legacy flat scent fields have been removed from the form—use Body Sensory Data entries for per-region scent, texture, and visual descriptions. Input like "strong musk, lightly floral" is parsed into structured data with intensity extraction.
- Character builder appearance section now uses a dynamic entry-based UI for per-region physical attributes (region → attribute → value), matching the body sensory data pattern. Appearance regions include: overall, hair, eyes, skin, face, arms, legs, feet. Attributes vary by region (e.g., hair has color, style, length; eyes has color, shape, expression).
- `speakingStyle` and `style` (speech style hints) have been removed from `CharacterProfileSchema` and the character builder. Dialogue style is now inferred from personality traits and details rather than explicit style parameters.
- Character profiles now support an optional `personalityMap` for structured NPC personality data. The `PersonalityMapSchema` includes Big Five dimension scores, emotional baseline (Plutchik-based emotions), core values with priority ranking, fears with triggers and coping mechanisms, attachment style, social patterns (stranger default, warmth rate, conflict style), speech style (vocabulary, formality, humor type), and stress behavior (fight/flight/freeze/fawn responses). Trait prompts can be injected into NPC system prompts using the `TRAIT_PROMPTS` registry—each trait ID maps to a short prompt fragment (~10-25 words). Trait conflict detection (`validateTraitSet()`) catches polar opposites, logical contradictions, and behavioral clashes at character creation time.
- Sensory intent detection extracts `bodyPart` from player input (e.g., "I smell her hair"). The `SensoryAgent` resolves raw body part references to canonical regions using `resolveBodyRegion()` from `@minimal-rpg/schemas`.
- Body region aliases enable natural language parsing (e.g., "locks" → "hair", "belly" → "torso"). When unspecified, sensory queries default to "torso" for general body scent.
- Web UI renders through a single responsive `AppShell` with mobile-optimized layout and shared controller/state logic.
- Session management uses immutable templates plus per-session snapshots so template edits never break in-flight sessions.
- OpenRouter is the sole LLM provider; legacy local Ollama support has been removed.
- Per-NPC transcripts persist in `npc_messages`; API sessions client now exports helpers to append and read NPC dialogue for a session (use the character instance id as the NPC id).
- Governor-backed turns now write per-NPC transcripts automatically, honor an optional `npcId` target, and persist overrides plus a `state_change_log` audit entry for applied patches and agents involved.
- Per-session `location`, `inventory`, and `time` slices are now stored in dedicated tables (`session_location_state`, `session_inventory_state`, `session_time_state`) and are loaded/persisted by the governor-backed `/sessions/:id/turns` route.
- Character and setting instances now store `overrides_json` alongside the mutable `profile_json`, and the turn route persists governor-produced overrides for future turns. Character instances also carry `role` + optional `label` so sessions can distinguish the primary PC from supporting NPCs.
- **Enhanced Tags System (MVP)**: Tags now support categories (style, mechanic, content, world, behavior, trigger, meta), activation modes (always/conditional), target types (session, character, npc, player, location, setting), and trigger conditions (intent, keyword, emotion, relationship, time, location, state). The tag builder UI includes sections for basics, activation, triggers (for conditional tags), and a live preview sidebar. Tags are stored in `prompt_tags` with session bindings in `session_tag_bindings`. Run `pnpm -F @minimal-rpg/db db:seed` to populate 13 built-in tags across style, mechanic, content, and world categories.
- **Compound Intent Detection**: The intent detector segments player input using the **asterisk rule**: text outside `*asterisks*` is speech (`talk`), text inside asterisks is classified as `action`, `thought`, `emote`, or `sensory`. Segment types are now first-class (no more `narrate` with subtypes). For example, `If I must *he jokes while noticing her scent*` becomes: talk("If I must") → action("he jokes") → sensory("noticing her scent", smell). The governor routes sensory segments to the SensoryAgent for body region lookups.
