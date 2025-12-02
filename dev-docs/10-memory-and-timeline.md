# Memory and Timeline

This document describes how Minimal RPG currently models and persists **memory** and the **timeline of a session**, and how those concepts are expected to evolve. It ties together sessions, messages, state instances, and the prompt builder’s history summarization. Future vector-based memory and richer timelines are sketched only where they are clearly aligned with the existing code and other up-to-date docs.

As of now there is **no dedicated long‑term memory store** (no RAG, no separate memory tables). All memory is derived from:

- The full message history per session (stored in Postgres).
- Per-session character and setting instances (`profile_json`).
- In‑prompt history summarization that condenses older turns.

Future work will layer additional memory mechanisms on top of this baseline.

## 1. Core Concepts

### 1.1 Sessions as the primary timeline

Sessions are the top‑level containers for a playthrough and act as the **authoritative timeline** for user/assistant turns.

- Database: `user_sessions` (see [dev-docs/01-domain-model-overview.md](dev-docs/01-domain-model-overview.md) and [dev-docs/05-state-and-persistence.md](dev-docs/05-state-and-persistence.md)).
- API types: `DbSession`, `DbMessage` in [packages/api/src/types.ts](packages/api/src/types.ts).
- Web types: `Session`, `Message` in [packages/web/src/types.ts](packages/web/src/types.ts).

Each session stores:

- Template and instance IDs for the active character and setting.
- Creation timestamp (`created_at` / `createdAt`).
- An ordered list of messages, each with:
  - `role` (`system` | `user` | `assistant`).
  - `content` (full text, never truncated in storage).
  - `created_at` / `createdAt` (ISO timestamp in the API/web layer).
  - `idx` (monotonic integer per session, used as the canonical ordering key).

Taken together, `messages[idx]` form the **chronological event log** of the conversation. At present there is no additional canonical event stream; higher‑level “events” are inferred from messages and state as needed.

### 1.2 Character and setting instances as stateful memory

Beyond the raw message timeline, Minimal RPG keeps **mutable per‑session state** for the active character and setting.

- Database: `character_instances`, `setting_instances` (see [dev-docs/05-state-and-persistence.md](dev-docs/05-state-and-persistence.md)).
- State fields (per instance):
  - `template_snapshot` – immutable JSON captured from the template when the session is created.
  - `profile_json` – the mutable JSON document representing the current state for that session.

The intent (partially implemented today and further elaborated in [dev-docs/10-state-manager-and-embedding-lifecycle.md](dev-docs/10-state-manager-and-embedding-lifecycle.md) in the future) is:

- `template_snapshot` preserves how the template looked at session start.
- `profile_json` is the **long‑lived memory** of what has changed for that character/setting during the session (for example, relationship shifts, flags, status effects) once the Governor and StateManager are fully wired.

As of now, most profile changes are still **design‑time only**; runtime mutation via JSON Patch and the Governor is scaffolded but not active.

### 1.3 Governor and StateManager (scaffolded)

The `@minimal-rpg/governor` and `@minimal-rpg/state-manager` packages define where richer memory and explicit timelines will live.

- Governor entrypoint: [packages/governor/src/governor.ts](packages/governor/src/governor.ts).
- The Governor will eventually:
  - Read effective state from the StateManager (merging template snapshot and overrides).
  - Call one or more agents/LLMs.
  - Apply **JSON Patch** deltas back into `profile_json` to record new long‑term facts.

Current status in code:

- `Governor.handleTurn` logs the request and returns an echo response; no agents, no state recall, and no state updates are implemented yet.
- The StateManager API is present as a dependency but its integration with the runtime loop is not wired into the API or web flow.

For now, effective memory for turns is reconstructed directly from DB and data files by the API layer rather than going through the Governor.

## 2. Timeline Storage in the Database

### 2.1 Message storage

Messages are stored in a dedicated `messages` table (see [packages/db/sql/001_init.sql](packages/db/sql/001_init.sql) and [packages/db/src/sessions.ts](packages/db/src/sessions.ts)) and exposed through the DB and API layers.

Key properties:

- Each message row belongs to a session via `session_id`.
- `idx` is an integer index that increases with each new message and defines the **authoritative order**.
- `created_at` preserves wall‑clock time for display and auditing.

In the DB client ([packages/db/src/sessions.ts](packages/db/src/sessions.ts)):

- `appendMessage(sessionId, role, content)` inserts a new row with the next `idx` for that session.
- `getSession(id)` returns a session plus all of its messages in order.
- `listSessions()` returns summaries; it does **not** load messages, only the top‑level session metadata.

On the API side ([packages/api/src/types.ts](packages/api/src/types.ts)) and web client ([packages/web/src/api/client.ts](packages/web/src/api/client.ts)) these map to `DbSession` / `Session` DTOs used by UI and prompt building.

### 2.2 Session lifecycle as a timeline spine

The session lifecycle described in [dev-docs/01-domain-model-overview.md](dev-docs/01-domain-model-overview.md) and [dev-docs/05-state-and-persistence.md](dev-docs/05-state-and-persistence.md) is the backbone of the timeline:

1. **Create** – `POST /sessions`:
   - Inserts a row into `user_sessions`.
   - Creates matching character/setting instances with `template_snapshot` and `profile_json`.
   - The message timeline starts empty.
2. **Append message** – `POST /sessions/:id/messages`:
   - Appends a `user` message via `appendMessage`.
   - Later in the request, appends an `assistant` message with the model’s reply.
3. **Mutate message** – `PATCH /sessions/:id/messages/:idx` and `DELETE /sessions/:id/messages/:idx`:
   - Allow manual correction of history while keeping `idx` as the structural ordering key.
4. **Delete session** – `DELETE /sessions/:id`:
   - Removes the session and cascades deletes to its messages and instances.

There is currently **no separate event log** for non‑message events (for example, item acquisition, relationship changes). When the Governor and StateManager are fully implemented, that kind of semantic change is expected to be expressed as JSON Patch operations against `profile_json` and/or dedicated item/state tables, not as standalone timeline events.

## 3. In‑Prompt Memory: History Summarization

The only active “memory compression” mechanism today is implemented in the prompt builder, in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts).

### 3.1 Algorithm

`buildPrompt` accepts the full ordered `history: DbMessage[]` for a session and applies `summarizeHistory` to older turns:

1. Choose a history window `historyWindow` (default 10) and a character budget `summaryMaxChars` (default 16000).
2. Keep the last `historyWindow` messages **verbatim** as chat messages in the prompt.
3. Treat earlier messages as “older history”:
   - Walk them from newest to oldest.
   - For each message, normalize whitespace and truncate content to ~500 characters.
   - Prefix each line with the role (`User`, `Narration`, or `System`).
   - Stop once `summaryMaxChars` would be exceeded.
4. Reverse the accumulated lines back into chronological order and join them into a single string.
5. If non‑empty, inject that string as a dedicated system message labeled `Context Summary (older turns)`.

This summary is **computed on the fly** for each turn; it is not written back to the database. The stored `messages` table always contains the full, uncompressed history.

### 3.2 Memory behavior and limitations

This summarization scheme yields the following behavior:

- Very recent turns are always available to the model verbatim.
- Older turns can influence behavior indirectly via the summary, but details may be compressed or dropped to respect the character budget.
- There is no notion of explicit importance or salience beyond **recency**; all older messages are treated equally aside from their order.
- Summaries are **stateless**: each call recomputes them from full history; there is no persistent, accumulating long‑term memory artifact.

Future vector‑based memory (see [dev-docs/07-retrieval-and-scoring.md](dev-docs/07-retrieval-and-scoring.md)) is expected to complement or partially replace this purely recency‑based scheme.

## 4. Long‑Term Memory: Today vs. Future

### 4.1 What exists today

From a runtime point of view, the system’s long‑term memory is currently just:

- The full, unsummarized `messages` history per session in Postgres.
- The per‑session character and setting instances (`profile_json`) once the Governor and StateManager start mutating them (not yet wired into the main flow).
- The **implicit memory** encoded in the prompt builder’s summarization, which shapes what the LLM can “remember” in long‑running sessions.

There are no:

- Vector embeddings stored for messages, profiles, or items.
- Memory‑specific tables (for example, `memory_events`, `profile_nodes`, `knowledge_nodes`).
- Background jobs for memory consolidation or forgetting.

### 4.2 Forward‑looking memory model (high‑level, not yet implemented)

Other design docs (especially [dev-docs/06-knowledge-node-model.md](dev-docs/06-knowledge-node-model.md) and [dev-docs/07-retrieval-and-scoring.md](dev-docs/07-retrieval-and-scoring.md)) describe a future where:

- Character and setting state are decomposed into **knowledge nodes** with embeddings and explicit importance scores.
- A retrieval layer ranks nodes based on similarity to the current query and narrative salience.
- Selected nodes are injected into the prompt as structured context sections (for example, `Knowledge Context`, `Memory Context`).

Those designs are still prospective; **no such tables or retrieval code appear in the current codebase**. This document reflects the current implementation and only references that model as the likely evolution path.

## 5. Timeline in the UI

On the client side ([packages/web](packages/web)), the session timeline is presented directly from the `messages` array.

- `getSession(sessionId)` returns a `Session` with its full `messages` list.
- UI components render messages in chronological order using `createdAt`/`idx`.
- Message edit/delete flows operate on the same indices and call the corresponding API endpoints.

There is no additional timeline visualization for higher‑level events yet; the chat log is the player’s primary view of the story timeline.

## 6. Interaction with the Governor (planned, partial)

While the Governor is not yet on the critical path for API requests, the intended interaction model around memory and timeline is:

1. The API (or a future orchestrator) receives a user message for a session.
2. It loads:
   - Session messages (the raw timeline).
   - Effective character and setting state (either directly from instances or via the StateManager once fully adopted).
3. The Governor (once integrated) will:
   - Inspect state + recent history to decide which agents to invoke.
   - Use agents’ outputs to propose **state mutations** (JSON Patch) and possibly structured events.
   - Commit accepted changes to `profile_json` (and other domain tables like items), turning them into durable session memory.
4. The prompt builder continues to construct the LLM prompt from current state plus summarized history.

Until that wiring exists, the Governor’s role in memory/timeline is effectively a **future placeholder**.

## 7. Guarantees and Non‑Goals (Current Implementation)

Given the current state of the codebase:

- The system **does not** guarantee any specific policy for forgetting beyond whatever the model implicitly does when old context is summarized away.
- There is **no cross‑session memory**; each session’s messages and instances are independent.
- There is **no separate audit trail** for state changes; once JSON Patch‑based mutation is introduced, that may be added as an explicit requirement.
- There is **no concurrency control** beyond the assumption of a single‑turn, request/response loop (see [dev-docs/05-state-and-persistence.md](dev-docs/05-state-and-persistence.md)).

## 8. TBD / Open Questions

The following memory/timeline topics are intentionally left as TBD because they are not yet implemented and cannot be inferred safely from code:

- **Knowledge node schema and storage** – exact shape of any `knowledge_nodes` / `profile_nodes` table, including how it references sessions vs instances vs global lore.
- **Embedding lifecycle** – when and how embeddings are computed, updated, or discarded for messages or profile fields.
- **LLM‑generated summaries as durable memory** – whether we will ever persist `Context Summary` strings or other rollups in the database for reuse across turns.
- **Explicit event log** – whether higher‑level game events (for example, item pickups, relationship milestones) will be written to a structured timeline separate from chat messages.
- **Memory across sessions** – whether future versions will allow a character, setting, or player profile to accumulate memory across multiple sessions.
- **Governor/StateManager APIs** – precise contracts for how the Governor requests historical context and commits new state.
- **Forgetting and pruning policies** – explicit rules (beyond context window pressure) for what gets forgotten or down‑weighted over time.

This document should be revised once the Governor, StateManager, and any vector‑based memory components move from design into production code.
