# Open Questions

This document aggregates open questions and TBD design decisions from the other dev docs. It is descriptive only; it does not introduce new requirements.

## Domain Model & Schemas

- Player vs NPC modeling — given that production design assumes a first-class Player entity (schema + DB layer), how should it relate to CharacterProfile and sessions, and what needs to change in the current runtime to support it?
- Multi-character / party sessions — can a single session bind multiple character templates/instances, and how does that affect schemas, prompts, and UI?
- Relationships — should relationships between characters (or between player and NPCs) be modeled explicitly (separate structures/tables) vs. kept as free-form data inside profile_json?
- Location hierarchy — what is the concrete relationship between SettingProfile and Region / Building / Room (IDs, containment, or something else)?
- Location persistence — should locations be stored as JSON files, DB tables, or a hybrid, and how is per-session location state tracked?
- Inventory model — how do we represent items, ownership, and equipment in schemas (definitions vs owners, clothing slots, etc.), and which parts become part of CharacterProfile vs. separate item tables?

## State & Persistence

- Overrides vs full documents — should profile_json represent a full effective document or a minimal overrides layer relative to template_snapshot, and how should overrides be computed and stored?
- Multi-character state — if sessions support multiple characters, how are per-session instances and overrides modeled and queried?
- Structured relationships and stats — do we introduce explicit structures for relationship graphs, stats (HP, XP, attributes), and flags, and where are they stored (profiles vs dedicated tables)?
- Location state — how is a player’s current location and movement history recorded in the state model (per-session fields, separate event log, or both)?
- Cross-session memory — will characters, settings, or players accumulate long-term memory across sessions, and how is that persisted and queried?
- Concurrency guarantees — what concurrency/locking model (if any) is needed for profile_json updates and message appends when multiple clients act on the same session?

## Governor, State Manager & Agents

- Intent representation — how is player intent represented (types, unions), and how is it derived (LLM, rules, hybrid)?
- Agent interfaces — what are the concrete TypeScript interfaces for agents (inputs, outputs, errors, timeouts), and how are multiple agents composed per turn?
- Patch format and normalization — do agents emit raw JSON Patch, higher-level events, or both, and should StateManager.applyPatches eventually compute minimal overrides vs. full-document replacements?
- Governor ↔ StateManager ↔ DB wiring — what are the exact contracts and helper layers for loading baseline/overrides, applying patches, validating, and persisting state?
- Session lifecycle from Governor’s view — how are sessions created, resumed, and terminated at the orchestration layer, and how much historical context does the Governor keep vs. reconstruct on demand?

## Prompting & Safety

- Safety rules integration — should safety-rules.json become a persistent safety system message in buildPrompt, and how does it interact with safety-mode messages?
- Multi-agent prompting — if we introduce specialized agents, do they each receive their own system prompts/configs, and how are those maintained alongside the current single-prompt path?
- Token budgeting — do we move from fixed historyWindow/summaryMaxChars to fully token-budgeted prompt construction per model and use case?
- Localization and style variants — how do we express language/locale and global style preferences (beyond per-character style) in prompts?

## RAG, Knowledge Nodes & Embeddings

- Node schema and ownership — what are the concrete table schemas for knowledge/profile nodes (character, setting, items, global), and are they unified or split per domain?
- Chunking granularity — which profile fields and JSON paths become standalone nodes, especially for long backstories, lore, or lists?
- Embedding provider & dimensionality — which embedding model(s) do we use, what vector sizes, and what distance metrics are standard in Postgres?
- Triggering & freshness — when are embeddings created/updated/deleted in response to state changes, and are those updates synchronous in the turn loop or handled by background jobs?
- Retrieval APIs — what are the exact TypeScript interfaces between the turn logic (API/Governor) and the retrieval layer (inputs, outputs, scoring knobs)?
- Salience lifecycle — how are base_importance and narrative_importance initialized, updated, and decayed, and which components are allowed to adjust them?
- Evaluation & observability — how do we measure the impact of RAG on quality and cost (metrics, traces, logs), and which debug tools exist to inspect retrieved context per turn?

## Items, Inventory & Outfits

- Seed data & authoring — where do initial item definitions live (files vs migrations vs admin UI), and how are they authored relative to character/setting JSON?
- Client exposure — how much of the item/inventory model is exposed to the web client vs. kept server-side only, and through which APIs?
- Appearance vs outfit — how do clothing/outfit details interact with the existing appearance schema (integrated fields vs separate outfit model), and which source of truth does the prompt builder use?
- Prompt footprint — what constraints should we enforce on how much item/outfit detail is injected into prompts per turn?

## Memory & Timeline

- Knowledge-node storage — what exact schema (and ownership model) will we use for long-term memory entities like knowledge_nodes/profile_nodes?
- Durable summaries — will we ever persist LLM-generated summaries or rollups (for example, Context Summary text) as reusable memory artifacts in the DB?
- Explicit event log — do we introduce a structured event timeline separate from chat messages (items acquired, milestones, relationship changes), and how does it relate to sessions and instances?
- Forgetting and pruning — beyond context-window pressure, what explicit policies (time-based, importance-based) govern forgetting or pruning of memories and nodes?

## Observability, Tooling & UX

- Logging and metrics — what standard logs, metrics, and traces do we record per turn (sessionId, agents invoked, RAG hits, patch sizes), and how do we balance insight vs. privacy?
- Admin/debug tooling — what developer or GM tools are needed to inspect effective state, overrides, knowledge nodes, RAG results, and prompt assemblies for a given session?
- Web UX for advanced features — how will multi-character sessions, inventories, maps, and richer timelines surface in the existing web UI flows?
