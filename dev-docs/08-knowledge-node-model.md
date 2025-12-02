# Knowledge Node Model

This document outlines a proposed **knowledge node** model for structuring and retrieving character and setting state using vectors and salience scores.

As of this writing, the live codebase does **not** implement knowledge nodes or any vector-based retrieval over character/setting profiles. The only vector-related pieces in code are:

- `CREATE EXTENSION IF NOT EXISTS vector` in [packages/db/sql/001_init.sql](packages/db/sql/001_init.sql).
- A thin wrapper around `pgvector/pg` in [packages/db/src/pgvector.ts](packages/db/src/pgvector.ts).

There are no tables like `profile_nodes` or `knowledge_nodes`, and the prompt builder does not query vectors. Everything below is forward-looking design.

## 1. Motivation

Character and setting profiles can grow large over time (appearance details, history, relationships, flags, items, etc.). Passing the entire JSON into every LLM call is:

- Inefficient for the context window.
- Noisy, making it harder for the model to focus on what matters.

A knowledge node model aims to:

1. **Break profiles into targeted chunks** (nodes) with well-defined meanings.
2. **Attach embeddings** so we can semantically retrieve only the relevant pieces.
3. **Track salience** over time so important facts stay in context even when not explicitly queried.

## 2. Concept: Knowledge nodes

Instead of treating a character or setting profile as a single JSON blob, we decompose it into a collection of **nodes**, each representing a focused piece of information.

Examples for a character (derived from `profile_json` fields):

- `appearance.hair` → "Messy brown medium-length hair."
- `appearance.eyes` → "Bright green eyes."
- `personality.traits` → "Shy and sarcastic, anxious in crowds."
- `history.childhood` → "Raised in a remote mountain village..." (possibly chunked by paragraph).

Each node would carry:

- **Owner reference** – which character or setting instance it belongs to.
- **Path** – a stable key like `appearance.eyes` or `history.childhood`.
- **Content** – human-readable text describing that aspect.
- **Embedding** – vector representation of `content` (and optional tags).
- **Salience metrics** – how intrinsically and narratively important this node is.

## 3. Proposed database shape

No such table exists yet. When we are ready to implement knowledge nodes, a migration might add something like:

```sql
CREATE TABLE profile_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  character_instance_id TEXT REFERENCES character_instances(id),
  setting_instance_id TEXT REFERENCES setting_instances(id),

  -- Metadata
  path TEXT NOT NULL,          -- JSON path, e.g. "appearance.eyes"
  content TEXT NOT NULL,       -- Human-readable description of that path

  -- Vector data
  embedding vector(1536),      -- From `content` (and optional tags)

  -- Salience metrics
  base_importance FLOAT DEFAULT 0.5,        -- Intrinsic importance (0–1)
  narrative_importance FLOAT DEFAULT 0.0,   -- Dynamic boost from story events
  last_accessed_at TIMESTAMPTZ,

  UNIQUE (character_instance_id, setting_instance_id, path)
);
```

The exact dimensionality (`vector(1536)`) and which owners are allowed (character, setting, or both) can be adjusted later.

## 4. Node creation and updates (Proposed)

Knowledge nodes would be derived from the same per-session state described in [dev-docs/05-state-and-persistence.md](dev-docs/05-state-and-persistence.md):

- Character data from `character_instances.profile_json`.
- Setting data from `setting_instances.profile_json`.

### 4.1 Initial ingestion

When a `character_instances` or `setting_instances` row is created or first ingested into the node system:

1. Load the full `profile_json` for that instance (this is the canonical structured state, including `appearance`, `personality`, and any notes-derived fields).
2. Walk the schema and map selected paths to node candidates (for example, `appearance.hair`, `appearance.eyes`, `personality.traits`, and key backstory sections).
3. For each candidate:
   - Render a concise `content` string based on the structured value (for example, `appearance.hair` → "Messy brown medium-length hair.").
   - Compute an embedding for `content`.
   - Insert a row into `profile_nodes` with a reasonable `base_importance`.

### 4.2 Incremental updates

When per-session state changes (for example via overrides or free-text-driven updates to `profile_json`):

1. Detect which JSON paths have changed (either by explicit patch metadata or by diffing old/new profiles). This includes paths like `appearance.hair` or `personality.traits` that may be populated by the extraction pipeline.
2. For each affected path:
   - Re-render the `content` string from the updated structured value.
   - Recompute the embedding.
   - Update or insert the corresponding `profile_nodes` row.

In early versions, we can start with **batch rebuilds** (recreate all nodes for an instance after each significant change) and move to finer-grained updates later if needed.

## 5. Retrieval: relevance + salience (Proposed)

When constructing a prompt for the LLM (for example, before answering a user message), the system can use knowledge nodes instead of raw JSON.

### 5.1 Query construction

To decide which nodes to include:

1. Build a **query string** from the latest user message plus recent context summary.
2. Compute an **embedding** for that query.

### 5.2 Scoring

For each candidate node belonging to the active character/setting instance, compute:

$$
ext{Score} = (w_1 \times \text{Similarity}) + (w_2 \times \text{TotalImportance})
$$

Where:

- `Similarity` is the cosine similarity between query and node embeddings.
- `TotalImportance = base_importance + narrative_importance`.
- `w1`, `w2` balance semantic relevance vs. salience (for example, 0.7 and 0.3).

Using pgvector, similarity can be computed directly in SQL (for example, using `<=>` or a library helper).

### 5.3 Selection

After scoring, we can:

- Take the top **K** nodes (for example, 10), or
- Include all nodes above a fixed threshold.

These nodes are then serialized into a compact text block such as:

```text
[Character Context]
- Eyes: Piercing blue eyes with a slight shimmer.
- Curse: Touch turns gold to lead.
```

and injected into the prompt alongside the usual character/setting summaries.

## 6. Dynamic salience (Proposed)

Salience lets the system "remember what matters" beyond direct semantic matches.

### 6.1 Automatic adjustments

- **On access**: when a node is selected and used in a prompt, slightly increase its `narrative_importance` and update `last_accessed_at`.
- **Decay**: on each turn or on a schedule, multiply `narrative_importance` by a decay factor (for example, 0.95) to let old, unused facts fade.

### 6.2 Governor-driven boosts

Future governor logic could explicitly adjust salience:

- Example: when the player acquires a cursed amulet, boost the node describing that amulet so it appears in unrelated but narratively important contexts.

This allows certain facts to stay foregrounded across multiple turns, even if they are not directly queried by the user.

## 7. Integration with the existing prompt builder (Proposed)

The current prompt builder in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts) does **not** query vectors or knowledge nodes; it serializes full profiles and summarized history.

When knowledge nodes are introduced, a likely evolution path is:

1. Add an internal `getKnowledgeContext(sessionId)` helper that:
   - Resolves the active character/setting instances.
   - Runs the query + scoring logic over `profile_nodes`.
   - Returns a small list of textual bullet points.
2. Insert these bullets into a dedicated section in the prompt (for example, `Knowledge Context:`) before recent chat history.
3. Gradually reduce the amount of raw JSON-derived text in the prompt as node coverage improves.

The design should ensure that **missing** nodes never break the system; the prompt builder must continue to function even if the node table is empty.

## 8. Implementation roadmap (High level)

None of the following steps have been started in the live codebase; they are a proposed order of work:

1. **Migrations** – add a `profile_nodes` (or `knowledge_nodes`) table using the existing pgvector extension.
2. **Ingestion service** – build a small service that maps `profile_json` → nodes and manages (re)embedding.
3. **APIs / jobs** – decide whether node generation runs synchronously during overrides/session creation or via background jobs.
4. **Retrieval helper** – implement the scoring + selection logic as a reusable function.
5. **Prompt wiring** – start injecting a small number of high-value nodes into the prompt and iterate based on LLM behavior.

## 9. TBD / Open questions

The following points are intentionally left open until we start implementing the knowledge node system:

- **Exact schema name and ownership model** – whether to split character vs setting nodes into separate tables or keep them combined.
- **Chunking granularity** – which JSON paths become individual nodes, especially for long backstories or lists.
- **Embedding provider and dimensionality** – which model to use and what vector length to standardize on.
- **Write path semantics** – whether node updates must be strictly in sync with `profile_json` updates or can lag slightly.
- **Error handling and fallbacks** – how to behave when embedding calls fail or the node table is empty.
- **Security and PII** – whether any node content should be filtered or obfuscated before embedding.

This document should be revisited once the first end-to-end knowledge node prototype exists in the repository.
