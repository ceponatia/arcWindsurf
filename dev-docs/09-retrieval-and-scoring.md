# Retrieval and Scoring

This document describes the current and proposed approaches for **retrieval and scoring** of context in Minimal RPG. It focuses on how the system decides **what information to surface to the LLM** and **how to prioritize it**.

As of now, there is **no RAG/vector retrieval wired into the runtime** despite pgvector being enabled in Postgres. All live behavior is based on:

- Serializing character and setting profiles directly into the prompt.
- Summarizing older chat history into a compact system message.

Vector-based retrieval and knowledge nodes are forward-looking designs covered in:

- [dev-docs/06-knowledge-node-model.md](dev-docs/06-knowledge-node-model.md)
- [dev-docs/04-items-inventory-and-outfits.md](dev-docs/04-items-inventory-and-outfits.md) (item-aware RAG, proposed)

This document ties those designs together from a **retrieval and scoring** perspective.

## 1. Current retrieval path (no RAG)

Today, retrieval is entirely relational and in-memory; there is no vector search.

### 1.1 Profile retrieval

When handling a message (`POST /sessions/:id/messages`):

1. The API loads the session row from `user_sessions`.
2. It resolves the **per-session instances** from `character_instances` and `setting_instances`.
3. It reads the `profile_json` for each instance and validates them against the shared Zod schemas.
4. It passes these effective profiles into the prompt builder.

There is no scoring beyond basic validation; the full effective profiles are considered relevant for every turn.

### 1.2 History summarization

For chat history, relevance is approximated by **recency** and a fixed character budget:

1. Fetch all messages for the session ordered by `idx`.
2. Keep the most recent N messages verbatim in the prompt.
3. Walk older messages from newest to oldest, building a condensed textual summary until a character limit is reached.

This simple scheme ensures that very old turns still influence the model through a summary, while recent turns remain fully visible. There is no per-message score beyond the implicit recency ordering.

## 2. Vector-based retrieval (Proposed)

Future work introduces true **retrieval and scoring** using:

- A **knowledge node** table (`profile_nodes` or similar) for character and setting facts (see [dev-docs/06-knowledge-node-model.md](dev-docs/06-knowledge-node-model.md)).
- Optional **item embeddings** for outfits and inventory (see [dev-docs/04-items-inventory-and-outfits.md](dev-docs/04-items-inventory-and-outfits.md)).

Both rely on the existing pgvector extension (`CREATE EXTENSION IF NOT EXISTS vector`), but no such tables or queries exist yet.

### 2.1 Retrieval targets

Under the proposed design, retrieval would operate over several domains:

- **Character knowledge nodes** – decomposed from `character_instances.profile_json`.
- **Setting knowledge nodes** – decomposed from `setting_instances.profile_json`.
- **Item definitions/instances** – equipment and inventory data.
- (Optionally) **global lore or timeline entries** in future docs.

Each target contributes ranked snippets that can be injected into the prompt.

## 3. Scoring model (Proposed)

For knowledge nodes, retrieval is based on a combination of **semantic similarity** and **salience**, as sketched in [dev-docs/06-knowledge-node-model.md](dev-docs/06-knowledge-node-model.md).

### 3.1 Similarity

Similarity measures how closely a node’s content matches the current query:

- Compute an embedding for a query built from the user’s latest message plus a short context summary.
- Use pgvector to compute cosine similarity between that query embedding and each candidate node’s embedding.

Higher similarity means the node is more directly relevant to what the player just asked or did.

### 3.2 Salience

Salience tracks how important a node is to the narrative, independent of immediate relevance. Each node maintains:

- `base_importance` – intrinsic weight (for example, major curse vs. hair color).
- `narrative_importance` – dynamic weight that can increase when the node is used or when story events highlight it.

Salience can be adjusted automatically (on access + decay) or explicitly by governor logic (for example, when a key item is acquired).

### 3.3 Combined score

For each candidate node, compute a final score:

$$
ext{Score} = (w_1 \times \text{Similarity}) + (w_2 \times \text{TotalImportance})
$$

Where:

- `TotalImportance = base_importance + narrative_importance`.
- `w1`, `w2` tune the tradeoff between “answer the question” and “remember what matters”.

The retrieval service can then:

- Take the top **K** nodes by score, or
- Include all nodes above a configurable score threshold.

## 4. Retrieval flows (Proposed)

Several retrieval flows can be layered together.

### 4.1 Character/setting context

1. Build a query from the latest user input + recent messages.
2. Retrieve and score knowledge nodes for the active character and setting.
3. Select the top K nodes and render them into a concise `Knowledge Context:` section, for example:

   ```text
   Knowledge Context:
   - Legs: Long, slender legs with a faint scar across the left ankle.
   - Personality Traits: Shy and sarcastic; anxious in crowds.
   ```

This supplements (or eventually replaces parts of) the raw character/setting text in the prompt. The **always-on** character block remains compact (core identity + minimal appearance), while turn-local `Knowledge Context` bullets supply detailed physical or historical information only when relevant to what the player just asked (for example, examining a character’s body or asking about their past).

### 4.2 Item-aware retrieval

For items (see [dev-docs/06-items-inventory-and-outfits.md](dev-docs/06-items-inventory-and-outfits.md)):

1. Limit the search space to items owned by the current character/session (via `item_owners` and `items`, resolved into an `EffectiveOutfit`).
2. Build query strings such as "something to cut the rope", "formal clothing", or direct examination lines like "I look at her boots".
3. Run vector search over item embeddings and/or simple keyword filters on the resolved outfit.
4. Return a few high-scoring items to include under an `Item Context:` section, for example:

   ```text
   Item Context:
   - Feet: Worn leather boots (adventurer style, scuffed but well-kept).
   ```

This allows the system to surface relevant gear and clothing **only** on turns where the player interacts with them, instead of always listing the entire inventory in the prompt.

### 4.3 Global lookup (optional)

In future, a global vector store (for lore, locations, or NPCs) could be queried:

1. Run similarity search over all nodes/items.
2. Filter results by availability or presence in the current scene.
3. Use the results to hint at discoverable content or recall long-term story threads.

## 5. Integration with the prompt builder (Proposed)

The current prompt builder in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts) builds prompts from:

- Effective character and setting profiles.
- Base system instructions and tag-specific rules.
- A summarized history plus recent verbatim messages.

With retrieval and scoring in place, the evolution path is:

1. Add internal helpers (for example, `getKnowledgeContext`, `getItemContext`) that return small lists of bullet points.
2. Insert these sections before or after the history summary as dedicated blocks.
3. Gradually shorten the raw profile text once retrieval coverage is good enough.

The prompt builder must remain robust even if retrieval fails or tables are empty; in that case, it should fall back to today’s behavior.

## 6. Current status and limitations

In the live codebase:

- pgvector is enabled and a typed wrapper exists, but **no** production code calls vector operations.
- There are **no** RAG endpoints, background jobs, or node/item embedding pipelines.
- All scoring is implicit (recency for history, fixed inclusion for profiles).

The retrieval and scoring designs in this doc, the knowledge node model, and item-aware RAG are therefore **purely prospective**.

## 7. TBD / Open questions

The following questions need to be answered before implementing retrieval and scoring:

- **Where to run embedding** – in-band on API requests vs. background workers.
- **Latency budget** – how much extra time per turn is acceptable for vector lookups.
- **Per-session limits** – caps on the number of nodes/items retrieved per request.
- **Safety and filtering** – how to ensure retrieved content respects content policies before being sent to the LLM.
- **Observability** – what metrics and logs we need to understand when retrieval helps or hurts quality.

This document should be updated once the first RAG or retrieval experiment is wired into the API.
