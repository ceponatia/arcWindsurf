# RAG Context Injection

This document describes how retrieval-augmented generation (RAG) is **intended** to work in Minimal RPG, and what is actually implemented today.

It connects the knowledge-node and retrieval designs to the prompt builder in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts) and the governor/state-manager plans. Anything not reflected in live code is explicitly marked as proposed or TBD.

## 1. Current Behavior (No RAG Yet)

As of now, the runtime **does not** perform any vector search or RAG:

- There are no knowledge-node or profile-node tables in Postgres.
- No code computes embeddings or calls pgvector at runtime.
- The prompt builder includes context using only:
  - Serialized `CharacterProfile` and `SettingProfile` blocks.
  - Summarized older chat history and recent verbatim messages.
  - Base and tag-specific system rules plus safety mode messages.

See:

- [dev-docs/14-prompting-conventions.md](dev-docs/14-prompting-conventions.md)
- [dev-docs/15-character-and-setting-prompts.md](dev-docs/15-character-and-setting-prompts.md)

The only vector-related code in the repo today is:

- `CREATE EXTENSION IF NOT EXISTS vector` in the initial SQL migration.
- A typed wrapper around `pgvector/pg` in [packages/db/src/pgvector.ts](packages/db/src/pgvector.ts).

Everything else in this document is **forward-looking design** for how we plan to inject retrieved context once RAG is implemented.

## 2. Goals for RAG Context Injection

RAG is intended to solve two main problems:

1. **Selective recall** – avoid sending entire character/setting JSON every turn by retrieving only the most relevant facts.
2. **Narrative salience** – keep important but not immediately mentioned facts (curses, long-term goals, key items) in context.

Concretely, we want to:

- Break large profiles into smaller, semantically meaningful **knowledge nodes**.
- Compute embeddings so we can do semantic search over those nodes and over items.
- Maintain per-node salience scores so high-importance facts are surfaced even when the user doesn’t explicitly ask about them.
- Inject the selected nodes into the prompt in a stable, well-structured way.

The underlying knowledge-node and scoring designs are captured in:

- [dev-docs/08-knowledge-node-model.md](dev-docs/08-knowledge-node-model.md)
- [dev-docs/09-retrieval-and-scoring.md](dev-docs/09-retrieval-and-scoring.md)

## 3. Where RAG Fits into the Turn Pipeline (Planned)

At a high level, once RAG is implemented, a single turn will look like this:

1. **API** receives `sessionId` and player text.
2. **State Manager** (and/or DB) loads effective character/setting instances.
3. **Retrieval layer** uses the latest input and recent history to query knowledge nodes and items.
4. **Prompt builder** assembles:
   - System rules.
   - Character and setting blocks.
   - RAG context blocks (knowledge nodes, items, etc.).
   - History summary and recent conversation.
5. **LLM** produces a response.
6. **State/Governor** apply updates and optionally adjust node salience.

Today, step 3 is entirely missing; steps 2 and 4 operate without any RAG.

## 4. RAG Context Blocks in the Prompt (Planned)

Once retrieval exists, we plan to inject dedicated sections into the prompt, for example:

- `Knowledge Context:` – character/setting knowledge nodes.
- `Item Context:` – items and equipment relevant to the current query.
- (Optionally) `Global Context:` – world lore, factions, or timeline entries.

### 4.1 Knowledge Context Block

The knowledge context block would be built roughly as:

1. Build a **query string** from:
   - Latest user message.
   - A short slice of recent history.
2. Compute a query embedding.
3. Run a similarity search over knowledge nodes for the active character and setting.
4. Combine similarity with salience (see [dev-docs/09-retrieval-and-scoring.md](dev-docs/09-retrieval-and-scoring.md)).
5. Select the top K nodes and render them into bullet points such as:

   ```text
   Knowledge Context:
   - Eyes: Piercing blue eyes with a slight shimmer.
   - Curse: Touch turns gold to lead.
   ```

These bullets would be inserted as a `system` message before the history summary.

### 4.2 Item Context Block

For items (inventory and outfits), the flow would be similar but scoped to items owned or visible in the current scene:

1. Restrict the candidate set to relevant items for the session.
2. Build a query embedding from the user request.
3. Run vector search over item embeddings.
4. Render a short list of item hints, for example:

   ```text
   Item Context:
   - You carry a steel dagger with a chipped edge.
   - You wear a formal navy coat suitable for court.
   ```

This supports queries like “Do I have anything sharp?” or “What should I wear to the ball?” without listing the full inventory.

### 4.3 Global Context (Optional)

If we add a global lore/timeline store in the future, a similar pattern can be used to surface relevant factions, locations, or past events that are not tied to a single character or setting instance.

## 5. Interaction with the Existing Prompt Builder

The current prompt builder in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts):

- Serializes a complete character block and setting block.
- Summarizes older history.
- Does **not** call any retrieval functions.

When RAG is introduced, the intended evolution is:

1. Introduce internal helpers (not yet implemented), for example:
   - `getKnowledgeContext(sessionId, latestUserText, history)`.
   - `getItemContext(sessionId, latestUserText, history)`.
2. Call these helpers inside `buildPrompt` to obtain optional context blocks.
3. Insert those blocks as additional `system` messages:
   - After base rules and profile blocks.
   - Before the history summary.
4. Optionally **shorten** the raw profile text once we have good coverage from nodes.

The builder must remain robust if retrieval fails or returns nothing; in that case, it should fall back to the current behavior (no RAG sections).

## 6. Salience and Updates (Planned)

Salience is described in more detail in [dev-docs/08-knowledge-node-model.md](dev-docs/08-knowledge-node-model.md) and [dev-docs/09-retrieval-and-scoring.md](dev-docs/09-retrieval-and-scoring.md).

From the perspective of context injection:

- Nodes with higher `base_importance` and `narrative_importance` are more likely to appear in the RAG sections, even if similarity is modest.
- Each time a node is included, retrieval code can:
  - Slightly increase `narrative_importance`.
  - Update `last_accessed_at`.
- A periodic decay step can reduce `narrative_importance` over time so old topics fade from context.

The governor or a dedicated state service would be responsible for these updates; `buildPrompt` should treat salience as read-only input.

## 7. Constraints and Safety Considerations

When we add RAG, we need to respect several constraints:

- **Token budget** – RAG blocks must be kept short enough to fit alongside rules, profiles, and history.
- **Safety** – retrieved content must still respect global safety rules. For example:
  - Filter or redact nodes/items that would violate safety policies before injecting them.
  - Ensure that retrieval does not surface disallowed content that is otherwise buried in state.
- **Ordering** – safety-related system messages from `safety-mode.json` should still be appended **after** any RAG sections so they can override or contextualize them.

These policies are not yet implemented and should be revisited once we have concrete RAG code.

## 8. Implementation Status Summary

Implemented today:

- pgvector extension and a small TypeScript wrapper.
- Non-RAG prompt assembly using profiles and history summaries.

Not implemented yet (design only):

- Knowledge-node or item embedding tables.
- Embedding computation and storage.
- Retrieval scoring and selection.
- Injection of `Knowledge Context` or `Item Context` sections into prompts.
- Salience updates based on usage.

## 9. TBD / Open Questions

The following points are intentionally left open and should be updated once an end-to-end RAG prototype exists:

- **Schema and ownership for nodes**
  - Exact table names and schemas for character, setting, item, and global nodes.
  - Whether to share a single `profile_nodes` table or split by domain.

- **Embedding provider and dimensionality**
  - Which embedding model to use (and whether it must match the chat model).
  - Standard vector size and distance metric configuration in Postgres.

- **Triggering and freshness**
  - When embeddings are recomputed in response to state changes.
  - Whether updates happen synchronously in the turn loop or via background jobs.

- **API and governor interfaces**
  - Exact TypeScript interfaces for retrieval helpers.
  - How the governor or API passes session and query info into the retrieval layer.

- **Evaluation and tuning**
  - How we will evaluate whether RAG context helps or hurts response quality.
  - What metrics (hit rates, token usage, latency) we track to tune thresholds and K.
