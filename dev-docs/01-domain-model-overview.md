# Domain Model Overview

This document summarizes the current domain model as implemented in the live codebase. It focuses on characters, settings, sessions, messages, and how their data flows through the API and database. Anything speculative or not yet wired into the runtime is called out explicitly or deferred to the TBD section.

## Top-Level Concepts

- **Character template** – a reusable character profile (NPC or player avatar) defined either as a JSON file on disk or as a dynamic row in Postgres.
- **Setting template** – a reusable world/scene profile defined in JSON on disk or as a dynamic row in Postgres.
- **Session** – a playthrough instance that binds one character template and one setting template and accumulates chat messages.
- **Character instance** – per-session snapshot of a character template; mutable copy tracked in the database.
- **Setting instance** – per-session snapshot of a setting template; mutable copy tracked in the database.
- **Message** – one turn of conversation (system/user/assistant) stored and replayed as chat history.

The current runtime loop is: _pick character + setting → create session → mutate per-session profiles via overrides → exchange chat messages via the LLM_.

## Characters

### Character Template Shape

Character templates are validated by `CharacterProfileSchema` from `@minimal-rpg/schemas` and loaded from both the filesystem and the database.

Key fields (non-exhaustive, based on usages in the API and prompt builder):

- `id: string` – stable identifier for the character.
- `name: string` – display name.
- `summary: string` – short overview of who the character is.
- `backstory: string` – longer narrative background, truncated for prompts when needed.
- `personality: string | string[]` – free text or list of traits.
- `appearance: string | AppearanceObject` – optional; may be a single description string or a structured object with subfields such as `hair`, `eyes`, `height`, `skinTone`, `torso`, `arms`, `legs`, `features`.
- `speakingStyle: string` – guidance on tone/voice.
- `tags?: string[]` – free-form tags used for UI and future routing.
- `style?` – optional structured style hints used in prompts (e.g. `sentenceLength`, `humor`, `darkness`, `pacing`, `formality`, `verbosity`).
- `scent?` – optional structured hints serialized into prompts when present.

Authoritative definition:

- Runtime type: `CharacterProfile` in `@minimal-rpg/schemas`.
- Storage:
  - Filesystem: `data/characters/*.json` (validated at API startup).
  - Database: `character_profiles.profile_json` (dynamic templates, JSONB, validated on read/write).
- **Filesystem templates** – loaded once at server startup and kept in memory. They are considered immutable through the HTTP API:
  - `/characters` lists them with `source: 'fs'`.
  - Attempts to POST a character with an ID that collides with a filesystem character are rejected.
  - Deletion of filesystem characters goes through a file-level helper (used by dev tooling), not DB deletes.

- **DB templates** – rows in `character_profiles` (and `character_template` via the Prisma-like client). They represent editable templates:
  - POST `/characters` with a valid `CharacterProfile` either creates or updates a DB-stored template.
  - These rows are serialized as `CharacterProfile` and surfaced with `source: 'db'`.

### Character Templates: Filesystem vs DB

Two sources of truth coexist:

- **Filesystem templates** – loaded once at server startup and kept in memory. They are considered immutable through the HTTP API:
  - `/characters` lists them with `source: 'fs'`.
  - Attempts to POST a character with an ID that collides with a filesystem character are rejected.
  - Deletion of filesystem characters goes through a file-level helper (used by dev tooling), not DB deletes.

- **DB templates** – rows in `character_profiles` (and `character_template` via the Prisma-like client). They represent editable templates:
  - POST `/characters` with a valid `CharacterProfile` either creates or updates a DB-stored template.
  - These rows are serialized as `CharacterProfile` and surfaced with `source: 'db'`.

### Character Instances (Per-Session Snapshots)

When a new session is created, the API creates a `character_instances` row:

- Schema (from `packages/db/sql/001_init.sql` and `packages/api/src/types.ts`):
  - `id: string` – stable instance ID.
  - `session_id: string` – foreign key to `user_sessions.id` (unique per session).
  - `template_id: string` – ID of the template this instance was derived from.
  - `template_snapshot: JSONB` – frozen copy of the original `CharacterProfile` at session creation.
  - `profile_json: JSONB` – mutable JSON representing the current per-session character profile.
  - Timestamps for auditing.

Creation behavior:

- POST `/sessions`:
  - Resolves the chosen `characterId` against filesystem templates first, then DB templates.
  - Writes a new `character_instances` row with both `template_snapshot` and `profile_json` set to the same initial JSON.

Effective character for a session:

- `getEffectiveProfiles` / `getEffectiveCharacter` in `packages/api/src/sessions/instances.ts` read the per-session `profile_json` (fallback to the baseline template only if parsing fails). There is no additional merge with the baseline beyond that fallback.
- Overrides are modeled as deep merges where arrays fully replace the baseline arrays instead of merging element-wise.

### Character Overrides API

The overrides layer allows changing a character for a specific session without altering the original template.

- Endpoint: `PUT /sessions/:id/overrides/character`.
- Input: arbitrary JSON object representing overrides.
- Behavior:
  - Looks up the session and its baseline character template.
  - Validates baseline with `CharacterProfileSchema` (overrides are treated as generic JSON, not separately validated as a full profile).
  - Applies a deep-merge strategy where arrays in overrides replace arrays in the existing profile.
  - Persists the updated per-session `profile_json` for the character instance.
  - Returns both the new effective character and an `OverridesAudit` object with `baseline`, `overrides`, and `previous` snapshots.

Overrides are the primary way the domain model supports state changes such as evolving personality traits, relationship metrics, and other mutable character properties.

## Settings

### Setting Template Shape

Setting templates are validated by `SettingProfileSchema` from `@minimal-rpg/schemas`.

Key fields (non-exhaustive, based on usages in the API and prompt builder):

- `id: string` – stable identifier for the setting.
- `name: string` – display name.
- `lore: string` – primary narrative description of the setting.
- `themes?: string[]` – thematic tags for tone and narrative hooks.
- `tags?: SettingTag[]` – tag subset used to select additional system prompt rules (e.g. `romance`, `adventure`, `mystery`).

Authoritative definition:

- Runtime type: `SettingProfile` in `@minimal-rpg/schemas`.
- Storage:
  - Filesystem: `data/settings/*.json` (validated at API startup).
  - Database: `setting_profiles.profile_json` / `setting_template.profileJson` (dynamic, editable templates).

### Settings: Filesystem vs DB

This mirrors the character behavior:

- Filesystem settings are loaded into memory, surfaced with `source: 'fs'`, and treated as read-only by the HTTP API.
- DB settings live in `setting_profiles` / `setting_template` and can be created, updated, and deleted via `/settings` endpoints.

### Setting Instances (Per-Session Snapshots)

When a session is created, a `setting_instances` row is created in the DB:

- Fields (simplified):
  - `id: string` – instance ID.
  - `session_id: string` – foreign key to `user_sessions.id` (unique per session).
  - `template_id: string` – ID of the template this instance was derived from.
  - `template_snapshot: JSONB` – frozen copy of the original `SettingProfile` at session creation.
  - `profile_json: JSONB` – mutable per-session setting profile.

Effective setting for a session:

- Computed similarly to characters via `getEffectiveProfiles` / `getEffectiveSetting`, using the per-session `profile_json` (baseline is only a fallback if parsing fails).

### Setting Overrides API

The overrides flow matches the character side:

- Endpoint: `PUT /sessions/:id/overrides/setting`.
- Input: arbitrary JSON object representing overrides.
- Behavior:
  - Validates the baseline template with `SettingProfileSchema`.
  - Merges overrides into the session-scoped `profile_json`, with array replacement semantics.
  - Returns the new effective setting plus an `OverridesAudit` structure.

This is how the domain model represents evolving locations, regional conditions, or campaign-specific modifications without rewriting the base setting templates.

## Sessions and Messages

### Session Core Model

Sessions represent a conversation + state container that binds one character template and one setting template.

Database table: `user_sessions` (see `packages/db/sql/001_init.sql`):

- `id: string` – session identifier, generated via `randomUUID` (or a time-based fallback).
- `character_template_id: string` – selected character template ID at creation time.
- `setting_template_id: string` – selected setting template ID at creation time.
- `created_at`, `updated_at` – timestamps.

API representation (subset):

- `DbSession` in `packages/api/src/types.ts`:
  - `id: string`.
  - `characterTemplateId: string`.
  - `characterInstanceId: string | null` – resolved instance ID at session creation time.
  - `settingTemplateId: string`.
  - `settingInstanceId: string | null` – resolved instance ID at session creation time.
  - `createdAt: string`.
  - `messages: DbMessage[]`.

### Session Lifecycle

1. **Creation** – POST `/sessions`:
   - Validates that `characterId` and `settingId` exist as either filesystem or DB templates.
   - Calls `createSession` in `@minimal-rpg/db` to insert into `user_sessions`.
   - Creates `character_instances` and `setting_instances` rows with initial snapshots.
   - Returns the session metadata including template and instance IDs.

2. **Listing** – GET `/sessions`:
   - Uses `listSessions` from `@minimal-rpg/db` to fetch `DbSessionSummary` rows.
   - Decorates each item with human-friendly `characterName` and `settingName` by searching in-memory templates, DB templates, or per-session instances.
   - Returns a `SessionListItem[]` DTO to the client.

3. **Retrieval** – GET `/sessions/:id`:
   - Returns the full session record including chronological messages.

4. **Deletion** – DELETE `/sessions/:id`:
   - Deletes the `user_sessions` row and cascades to messages and instances.

### Messages

Messages are stored per session and serve as chat history for the LLM.

Database table: `messages` (see `packages/db/sql/001_init.sql`):

- `id: string` – message ID.
- `session_id: string` – foreign key to `user_sessions`.
- `idx: number` – per-session index, unique for each `(session_id, idx)` pair.
- `role: 'system' | 'user' | 'assistant'` – role label; stored as text.
- `content: string` – message body.
- `created_at` – timestamp.

API types:

- `DbMessage` – internal representation used in prompt building.
- `MessageResponse` / `MessageResponseBody` – outward-facing DTOs for the web client.

### Message Lifecycle

The primary mutation path is `POST /sessions/:id/messages`:

1. Validates that the session exists and that the request body contains a `content` string between 1 and 4000 characters.
2. Appends a `user` message via `appendMessage` from `@minimal-rpg/db`.
3. Rebuilds the session history and computes effective character and setting profiles via `getEffectiveProfiles`.
4. Calls `buildPrompt`, which:
   - Serializes the character and setting into structured system messages.
   - Adds base system rules and tag-specific rules based on the setting’s tags.
   - Summarizes older history and appends recent messages verbatim.
   - Optionally adds content-safety system messages when sensitive content is detected.
5. Sends the assembled message list to OpenRouter using the configured model and hyperparameters.
6. Appends the assistant’s reply to the session as a new `assistant` message.
7. Returns the last stored message (including its index) to the client.

Messages can also be:

- **Updated** – `PATCH /sessions/:id/messages/:idx` mutates the `content` of a specific message.
- **Deleted** – `DELETE /sessions/:id/messages/:idx` removes a single message.

These operations allow manual correction or cleanup of chat history without recreating the session.

## Prompting and Domain Serialization

The prompt builder is the central place where domain objects are turned into LLM-readable text.

### Character Serialization

`serializeCharacter` in `packages/api/src/llm/prompt.ts` converts a `CharacterProfile` into a multi-line string approximately of the form:

- `Character: <name>`
- Optional age line.
- `Summary: <summary>`
- `Backstory: <backstory>` (truncated for length).
- `Personality` or `Personality Traits`.
- `Appearance` – either a raw string or a composed description from structured appearance fields.
- `Speaking Style`.
- `Tags` and style hints.
- Optional scent hints.

The appearance and style fields are deliberately structured to keep the LLM’s view of the character coherent and concise.

### Setting Serialization

`serializeSetting` converts a `SettingProfile` into a multi-line string including:

- `Setting: <name>`
- `Lore: <lore>` (truncated for length).
- Optional `Themes` and `Tags` lines.

Combined with base rules and tag-specific rules, this yields a compact but expressive context for the LLM.

### History Summarization

Older messages are summarized into a single system message created by `summarizeHistory`:

- Keeps the last N messages verbatim.
- For earlier messages, walks them from newest to oldest, extracts condensed lines with role prefixes (User / Narration / System), and stops when a configured character budget is reached.
- The resulting summary is injected as `Context Summary (older turns)`.

This is an important part of the domain model because it defines which parts of prior conversation remain salient in long-running sessions.

## Persisted vs In-Memory Domain State

The system splits domain state into three layers:

1. **Static, versioned content** – character and setting JSON files in `data/`.
2. **Dynamic templates** – character and setting profiles stored in Postgres and editable via the API.
3. **Per-session instances** – character and setting snapshots with mutable `profile_json` fields capturing evolving state for a single playthrough.

At runtime, the API maintains an in-memory `LoadedData` structure with all filesystem characters and settings. Database-backed templates and instances are loaded on demand and always validated with the shared Zod schemas before being used.

## Not Yet Implemented in the Runtime

Several concepts exist in docs or code but are not yet wired into the main HTTP request path:

- `@minimal-rpg/governor` – orchestration and multi-agent governor logic is scaffolded but not invoked by the API routes.
- `@minimal-rpg/state-manager` – JSON Patch–based state manager helpers exist but are not yet used for session state updates in the live API.
- Item / inventory / clothing system – domain design and docs exist in `dev-docs/archive/items-and-clothing.md`, but no corresponding DB tables, schemas, or API routes are present in the current code.
- Location maps / navigation graph – navigation design exists in archived docs, but there are no map schemas or map-specific DB tables in the codebase.
- Vector-based knowledge nodes and salience – pgvector is enabled and reserved for future use, but no profile-node tables or retrieval flows are wired into the prompt path yet.

These should be treated as future work rather than current behavior.

## TBD / Open Questions

The following aspects are not clearly defined in the current code and should be considered TBD:

- **Player vs NPC distinction** – the runtime treats all characters as `CharacterProfile` templates without a first-class “player character” type; any distinction is currently implicit.
- **Multi-character or party sessions** – sessions currently bind exactly one character template and one setting template. Future support for multiple characters per session would require schema and prompt changes.
- **Structured relationship modeling** – relationships (e.g. trust, affection) are likely fields inside character profiles but are not explicitly modeled in the shared types or DB schema.
- **Location granularity within a setting** – regions, buildings, rooms, and navigation between them are not represented in the live schemas yet.
- **Persistent inventory / outfits** – there is no persisted inventory or outfit state in the DB schema as of now; any mention of items in prompts would need to be baked into the character/setting JSON.
- **Explicit timeline or memory model** – apart from chat history and future vector storage, there is no dedicated timeline or event-log table modeling in-world events.

This section should be revisited as new features in governor, state-manager, items, or maps move from design docs into the live codebase.
