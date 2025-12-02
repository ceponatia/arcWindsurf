# State and Persistence

This document describes how Minimal RPG represents, stores, and mutates game state across characters, settings, sessions, and messages in the **current** codebase. Anything not implemented yet is called out explicitly or moved to a TBD section.

## 1. Layers of State

The system splits state into three main layers:

1. **Static templates on disk** – JSON files under `data/characters` and `data/settings` validated at API startup.
2. **Dynamic templates in Postgres** – editable character and setting profiles stored as JSONB.
3. **Per-session instances** – snapshots of templates with mutable JSON for each session.

These layers are shared between characters and settings; sessions and messages then reference them to drive the runtime loop.

### 1.1 Static templates (filesystem)

- **Characters**: `data/characters/*.json`
- **Settings**: `data/settings/*.json`

At API startup, `loadData` in [packages/api/src/data/loader.ts](packages/api/src/data/loader.ts) reads these files, validates them with Zod schemas from `@minimal-rpg/schemas`, and stores them in an in-memory `LoadedData` structure. If any file fails validation, the server logs the error and exits.

Templates loaded from disk are treated as **read-only** by the HTTP API; editing them is a file-level/dev operation, not a runtime action.

### 1.2 Dynamic templates (database)

Dynamic templates live in Postgres and mirror the filesystem shapes:

- **Character templates**: table `character_profiles` (`profile_json JSONB`).
- **Setting templates**: table `setting_profiles` (`profile_json JSONB`).

The API exposes CRUD endpoints under `/characters` and `/settings` that can create or update these DB-backed templates. On read and write, `profile_json` is validated with the same Zod schemas used for filesystem templates to ensure a single source of truth for shapes and constraints.

For characters, `profile_json` is also the home for **parsed attributes** derived from free-text fields:

- Structured `appearance` and `personality` fields (for example, `appearance.hair.color`, `appearance.eyes.color`, `personality.traits`, `personality.speechStyle.formality`) are stored as nested keys that match the `CharacterProfile` schema.
- When authors edit appearance/personality via the UI, they can provide free-text notes such as `appearanceNotes` and `personalityNotes`. The backend extracts a **partial CharacterProfile** from these notes and deep-merges it into the existing `profile_json` for that template.
- Raw notes may be stored inside `profile_json.meta`, using keys like `appearanceNotesRaw` and `personalityNotesRaw`, so that future re-parsing or debugging can refer back to the original text.

This JSONB-centric approach is the preferred way to extend appearance and personality over time; new details are added as nested fields inside `profile_json` rather than introducing additional relational columns.

Filesystem and DB templates coexist:

- Filesystem templates are loaded into memory at startup and surfaced with a `source` flag like `fs`.
- DB templates are fetched on demand and surfaced with `source` like `db`.
- Session creation resolves template IDs against both sources.

### 1.3 Per-session instances (database)

When a new session is created, the API records which templates were chosen and creates **instances** for that session:

- Table `character_instances`:
  - `id TEXT PRIMARY KEY` – per-session character instance ID.
  - `session_id TEXT` – FK to `user_sessions.id` (unique per session).
  - `template_id TEXT` – ID of the underlying character template.
  - `template_snapshot JSONB` – frozen copy of the template at session creation.
  - `profile_json JSONB` – mutable per-session character profile.
- Table `setting_instances`:
  - Same pattern as `character_instances` but for settings.

On creation, `template_snapshot` and `profile_json` are initially identical. All later state changes for that session are modeled as edits to `profile_json`; the snapshot stays immutable so the origin of the session is always recoverable.

When building prompts or responding to API requests, the effective character or setting for a session is derived from the per-session `profile_json` (falling back to the snapshot only if parsing fails).

## 2. Sessions

Sessions are the top-level containers for a playthrough and bind together templates, instances, and messages.

### 2.1 Session storage

The core table is `user_sessions` (created in [packages/db/sql/001_init.sql](packages/db/sql/001_init.sql)):

- `id TEXT PRIMARY KEY` – session ID.
- `character_template_id TEXT NOT NULL` – chosen character template ID.
- `setting_template_id TEXT NOT NULL` – chosen setting template ID.
- `created_at`, `updated_at` – timestamps.

The API’s session types also track the instance IDs so consumers can jump directly to per-session state:

- `characterInstanceId: string | null` – instance in `character_instances`.
- `settingInstanceId: string | null` – instance in `setting_instances`.

### 2.2 Session lifecycle

The main operations are:

- **Create** – `POST /sessions`:
  - Validates that the requested `characterId` and `settingId` exist in either filesystem or DB templates.
  - Inserts a row into `user_sessions`.
  - Creates matching `character_instances` and `setting_instances` rows with `template_snapshot` and `profile_json` set to the selected template JSON.
- **List** – `GET /sessions`:
  - Reads summaries from the DB.
  - Decorates them with character and setting display names by looking up templates or instances.
- **Get** – `GET /sessions/:id`:
  - Returns the session plus its messages and associated template/instance IDs.
- **Delete** – `DELETE /sessions/:id`:
  - Removes the `user_sessions` row and cascades deletes to `messages`, `character_instances`, and `setting_instances`.

## 3. Messages

Messages persist the turn-by-turn conversation history for each session.

### 3.1 Message storage

Messages live in the `messages` table ([packages/db/sql/001_init.sql](packages/db/sql/001_init.sql)):

- `id TEXT PRIMARY KEY` – message ID.
- `session_id TEXT NOT NULL` – FK to `user_sessions.id`.
- `idx INTEGER NOT NULL` – per-session index (unique per `(session_id, idx)`).
- `role TEXT NOT NULL` – `system`, `user`, or `assistant`.
- `content TEXT NOT NULL` – message body.
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.

### 3.2 Message lifecycle

The main flow is `POST /sessions/:id/messages`:

1. Validates the session and the incoming user `content`.
2. Appends a `user` message to `messages` with the next `idx`.
3. Rebuilds the session context:
   - Loads recent `messages` for the session.
   - Loads effective `character` and `setting` profiles from `character_instances` / `setting_instances`.
4. Calls the prompt builder to assemble the system + history messages.
5. Sends the prompt to OpenRouter and gets an `assistant` reply.
6. Appends the `assistant` message as a new row in `messages`.
7. Returns the stored assistant message (including its `idx`) to the client.

Messages can also be updated or deleted via targeted endpoints, allowing manual correction of history without recreating sessions.

### 3.3 History summarization

To keep history within the model’s context window, the prompt builder summarizes older turns:

- Keeps the most recent N messages verbatim.
- Walks through earlier messages from newest to oldest, building a condensed textual summary with role labels.
- Stops once a configured character budget is reached and injects this as a `Context Summary (older turns)` system message.

This summarization is purely in-memory; the database always stores full, unsummarized messages.

## 4. Overrides and mutable state

Per-session state changes for characters and settings are expressed as **overrides** to the instance `profile_json`.

### 4.1 Character overrides

- Endpoint: `PUT /sessions/:id/overrides/character`.
- Input: arbitrary JSON object representing the desired changes.
- Behavior (simplified):
  - Loads the current character instance for the session.
  - Validates the baseline using `CharacterProfileSchema`.
  - Deep-merges overrides into `profile_json` with the rule that arrays in overrides **replace** arrays in the existing profile.
  - Persists the updated `profile_json` back to `character_instances`.
  - Returns the new effective character profile plus an audit object showing `baseline`, `overrides`, and `previous` state.

When appearance or personality is edited via **free-text** in the UI for a running session, the write path follows the same pattern but with an extraction step:

1. Load the existing `profile_json` for the relevant row in `character_instances`.
2. Run the extraction pipeline over `appearanceNotes` / `personalityNotes` to produce a **partial CharacterProfile** that only includes confidently inferred fields (for example, `appearance.hair.color`, `appearance.height`, `personality.traits`, `personality.speechStyle.formality`).
3. Optionally stash the raw notes under `profile_json.meta.appearanceNotesRaw` / `profile_json.meta.personalityNotesRaw`.
4. Deep-merge the extracted partial into the current `profile_json` (objects merged recursively, arrays replaced by overrides).
5. Persist the updated `profile_json` JSONB back to the `character_instances` row.

The same JSONB-first approach applies when editing DB-backed character templates (`character_profiles`): changes are expressed as partial `CharacterProfile` documents and merged into `profile_json`, rather than adding new columns for each appearance or personality attribute.

### 4.2 Setting overrides

- Endpoint: `PUT /sessions/:id/overrides/setting`.
- Behavior mirrors character overrides but uses `SettingProfileSchema` and `setting_instances`.

Overrides are the primary mechanism for evolving state such as relationships, flags, and environmental changes without altering shared templates.

## 5. In-memory vs persisted state

At runtime, the API server combines in-memory and persisted state:

- On startup, [packages/api/src/server.ts](packages/api/src/server.ts) calls `loadData` and holds a `LoadedData` object containing all filesystem characters and settings.
- Routes that need templates:
  - Consult `LoadedData` for filesystem templates.
  - Use `@minimal-rpg/db` helpers to read or write DB templates and instances.
- Prompt building always pulls **persisted** messages and **persisted** per-session `profile_json` from the database, never from the in-memory snapshots.

The in-memory layer is therefore a cache of static content, while all mutable game state (including dynamic templates and session instances) is authoritative in Postgres.

## 6. Not yet wired into the state loop

Several packages and designs relate to state but are **not** currently in the main HTTP request path:

- `@minimal-rpg/governor` – contains prototypes for multi-agent orchestration and richer state management but is not invoked by the API.
- `@minimal-rpg/state-manager` – contains JSON Patch helpers and state management scaffolding; current overrides logic in the API uses its own merge utilities.
- Vector-based knowledge nodes – archived docs describe splitting profiles into nodes and storing embeddings, but there is no `profile_nodes` (or similar) table or retrieval code in the live prompt builder.
- Items, inventory, and outfits – see [dev-docs/04-items-inventory-and-outfits.md](dev-docs/04-items-inventory-and-outfits.md); no item tables or item state are present in the DB schema.

These should be treated as future extensions to the state model rather than current behavior.

## 7. TBD / Open questions

The following aspects of state and persistence are not fully defined in the current codebase:

- **Player vs NPC modeling** – in the current runtime there is no first-class "player" table; all actors use the same `CharacterProfile` shape, and any distinction is implicit. The production design, however, assumes a future first-class Player entity with its own schema and persistence.
- **Multi-character sessions** – sessions bind exactly one character template and one setting template; support for parties or multiple concurrent characters would require schema and API changes.
- **Structured relationships** – relationship graphs or stats (for example, trust/affection counters) are not modeled explicitly in the database and would live inside `profile_json` if added.
- **Location state** – while location schemas exist in [packages/schemas/src/location](packages/schemas/src/location), there are no location tables or per-session location tracking yet (see [dev-docs/03-settings-and-locations-schema.md](dev-docs/03-settings-and-locations-schema.md)).
- **Vector memory / long-term state** – pgvector is enabled and reserved for future use, but no vectors are stored or queried as part of session state today.
- **Concurrency guarantees** – the code assumes a turn-based flow; there is no explicit optimistic locking/versioning on `profile_json` for concurrent writes.

This document should be revisited as the governor, state-manager, items, or location systems move from design into production code.
