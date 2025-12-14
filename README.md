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

**Unit tests** (vitest): Run tests for packages with test coverage:

```bash
pnpm -F @minimal-rpg/web test              # Web package (workspace store)
pnpm -F @minimal-rpg/agents test           # Agents package
pnpm -F @minimal-rpg/state-manager test    # State manager package
pnpm -F @minimal-rpg/retrieval test        # Retrieval package
```

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

### Docker Compose (dev)


Postgres data lives in the `pgdata` volume. Use `docker compose down -v` if you want a fresh DB.

---
- [dev-docs/planning/gpt-refactor.md](dev-docs/planning/gpt-refactor.md) - Consolidated phased implementation plan for Session Workspace + builders + runtime NPC systems

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

- [26-time-system.md](dev-docs/26-time-system.md) – Game time tracking and configuration (foundation complete)
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
- **Progressive Disclosure**: Three complexity modes in Character Builder
  - Quick Mode (5 fields): Name, age, gender, summary, profile picture
  - Standard Mode (~20 fields): Quick + personality traits, backstory, key appearance, tags
  - Advanced Mode (~100 fields): Standard + detailed physique, body sensory map, detailed personality

### Hygiene & Sensory System

- **Dynamic Hygiene State**: Per-NPC, per-body-part hygiene tracking with decay over time
- **Activity Multipliers**: Different activities (idle, walking, running, labor, combat) affect decay rate
- **Footwear Modifiers**: Barefoot/sandals/shoes/boots affect feet hygiene decay
- **Environment Effects**: Dry/humid/rain/swimming conditions modify decay
- **Sensory Modifiers**: Context-aware smell/touch/taste descriptions based on hygiene level (0-4)
- **Governor Tools**: `update_npc_hygiene` and `get_hygiene_sensory` for runtime state management

### Intent & Interaction

- **Compound Intents**: Asterisk rule for parsing mixed speech/action/thought/sensory input
- **Sensory Agents**: Body region resolution for natural language queries (e.g., "her hair" → hair region)
- **Multi-Action Processing**: Enhanced NPC responses for action sequences with temporal ordering
- **Tool-Based Turn Handler**: LLM intelligently decides when to call tools based on context
  - Replaces brittle rule-based intent detection
  - Rich system prompts include full NPC profile (backstory, personality, speech style, goals)
  - Setting/location context with atmosphere and exits
  - Body map sensory data summary (available regions and senses)
  - Player persona context for personalized NPC responses
  - 18-message conversation history window for context continuity
  - The LLM understands: "He looks at Taylor's face" (sensory) vs "He looks up hopefully" (narrative)

### Session Management

- **Session Workspace**: Multi-step wizard for session configuration (WIP)
  - Zustand store with localStorage persistence and server sync
  - Step 1: Setting selection with time configuration
  - Step 2: NPC cast configuration with role/tier assignment
  - Step 3: Player persona selection or anonymous play
  - Step 4: Tags and rules selection
  - Step 5: Review and launch
  - Compact Builder mode for power users
- **Transactional Creation**: `POST /sessions/create-full` atomic endpoint
- **Entity Usage Tracking**: "Where is this used?" API endpoints
  - `GET /entity-usage/characters/:id` - Sessions using a character
  - `GET /entity-usage/settings/:id` - Sessions using a setting
  - `GET /entity-usage/personas/:id` - Sessions using a persona
  - UI component: EntityUsagePanel with collapsible session list
- **Session Tags Injection**: Active tags injected into Governor system prompts
- **Draft Persistence**: Auto-save workspace drafts to database
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
- **Tool-Based Turns**: Classic intent detection removed; LLM-driven tool calling only
- **LLM Efficiency**: SensoryAgent provides data, NpcAgent writes prose (1 LLM call vs 2-3)

### Location & NPC State

- **NPC Location Tracking**: Per-session state for where NPCs are and what they're doing
- **Location Occupancy**: Tracks who is at each location, recent departures, expected arrivals
- **Crowd Level Classification**: `empty`, `sparse`, `moderate`, `crowded`, `packed`
- **NPC Awareness**: How NPCs perceive the player (unaware/peripheral/noticed/focused)
- **NPC Availability**: Sleep, travel, busy states with override mechanics
- **Lazy Simulation Cache**: Tiered simulation strategy for performance

### Time System

- **GameTime**: In-game time with configurable calendars (year, month, day, hour, minute, second)
- **TimeConfig**: Setting-level configuration for time scales, day periods, calendars
- **Day Periods**: Named periods (dawn, morning, afternoon, etc.) with descriptions
- **Calendar Support**: Custom month names, day names, seasons, holidays
- **Time Skip Config**: Configurable max skip hours, justification requirements, cooldowns
- **Session Time State**: Per-session time tracking with pending events
- **Time Utilities**: Pure functions for advancing time, formatting, period detection

### NPC Tier System

- **Four Tiers**: Major (full profile), Minor (partial), Background (minimal), Transient (generated)
- **Player Interest Scoring**: Track engagement with NPCs for automatic promotion
- **Bleed Rate**: Interest decays over time, slower for high-investment NPCs
- **Promotion Thresholds**: Configurable per-setting promotion requirements
- **Simulation Priority**: Tier-based priority with recency decay (eager→active→lazy→on-demand)
- **Profile Expansion**: Track which fields need LLM generation on promotion

### NPC Schedule System

- **Schedule Slots**: Time-bound activity definitions with location and activity
- **Choice-Based Destinations**: Weighted options with 2d6 bell curve resolution
- **Condition System**: Weather, relationship, player presence, custom conditions
- **Override Support**: Temporary schedule changes (stay-put, go-to, follow-npc, unavailable)
- **Schedule Templates**: Reusable patterns (shopkeeper, guard, tavern keeper, noble, wanderer)
- **Placeholder Resolution**: Templates with $workLocation, $homeLocation substitution
- **Common Activities**: Pre-defined activities (sleeping, working, socializing, etc.)
- **Governor Tools**:
  - `generate_npc_schedule`: Create schedule from template with placeholder resolution
  - `assign_npc_location`: Match NPC profile to appropriate location
  - `get_schedule_resolution`: Resolve current location/activity from schedule

### NPC Simulation System

- **Tiered Simulation**: Eager/active/lazy/on-demand strategies based on NPC tier and distance
- **Priority Calculation**: Recency bonus, distance penalty, interest boost for simulation order
- **Simulation Triggers**: Turn, period-change, location-change, time-skip events
- **Cache Management**: Validity checking with configurable TTL by fidelity level
- **Budget Constraints**: Max NPCs per tick, per period, with overage handling
- **Time Skip Handling**: Batch simulation with configurable fidelity and summarization
- **Occupancy Utilities**: Prompt context building, departure/arrival filtering, NPC sorting

### Affinity & Relationship System

- **Multi-Dimensional Scores**: Fondness, trust, respect, comfort, attraction, fear (-100 to 100)
- **Disposition Calculation**: Weighted composite (hostile→unfriendly→neutral→friendly→close→devoted)
- **Affinity Effects**: 40+ action types with dimension-specific effects
- **Diminishing Returns**: Repeated actions have reduced effect with configurable decay
- **Natural Decay**: Affinity drifts toward neutral over time (configurable per-dimension)
- **Unlock System**: Dialogue topics, favors, secrets, romance options based on thresholds
- **Tolerance Profiles**: Per-NPC tolerance for insults, prying, flattery based on affinity
- **Milestone Events**: Permanent relationship shifts from significant events
- **Prompt Context**: LLM-ready relationship insights and available actions
```
