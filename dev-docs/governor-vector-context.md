# Governor: Vector-Based Context Retrieval & Salience

This document details the architecture for retrieving character and setting details using a hybrid approach of **Semantic Vector Search** (Relevance) and **Dynamic Importance Scoring** (Salience).

## 1. The Problem

As character profiles and world settings grow, they exceed the optimal context window of the LLM. Passing the entire JSON state is inefficient and can confuse the model.

We need a system that:

1. **Retrieves Relevant Details**: If the user asks about "eyes", we fetch eye color, shape, etc.
2. **Injects Salient Details**: If a specific attribute (e.g., a cursed scar) is critical to the current narrative arc, it should be included even if the user didn't explicitly ask about it.

## 2. Data Structure: Profile Nodes

We treat the character profile (Baseline + Overrides) not as a monolithic JSON, but as a collection of **Knowledge Nodes**.

### 2.1. Schema Proposal

We introduce a new table `profile_nodes` (or `knowledge_nodes`) in Postgres.

```sql
CREATE TABLE profile_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  character_instance_id TEXT REFERENCES character_instances(id),
  -- OR setting_instance_id ...

  -- Metadata
  path TEXT NOT NULL,          -- JSON path, e.g., "appearance.eyes"
  content TEXT NOT NULL,       -- The actual text, e.g., "Piercing blue eyes with a slight shimmer."

  -- Vector Data
  embedding vector(1536),      -- Generated from `content` + context tags

  -- Salience Metrics
  base_importance FLOAT DEFAULT 0.5,    -- Intrinsic importance (0-1)
  narrative_importance FLOAT DEFAULT 0.0, -- Dynamic boost based on story events
  last_accessed_at TIMESTAMPTZ,

  UNIQUE(character_instance_id, path)
);
```

### 2.2. Chunking Strategy

When a `CharacterInstance` is created or updated, we decompose the JSON into nodes.

- **Granularity**: We map specific schema fields to nodes.
  - `appearance.eyes` -> Node
  - `personality.traits` -> Node (list items might be grouped or split)
  - `history.background` -> Chunked by paragraph if long.
- **Updates**: When `overrides` change (via `StateManager`), we identify which paths were modified and re-embed only those nodes.

## 3. Retrieval Logic: The Hybrid Score

When constructing the prompt for an Agent, the Governor performs a retrieval step.

**Query**: The user's input + recent context summary.

For each node, we calculate a **Final Score**:

$$
\text{Score} = (w_1 \times \text{Similarity}) + (w_2 \times \text{TotalImportance})
$$

Where:

- **Similarity**: Cosine similarity between Query Embedding and Node Embedding.
- **TotalImportance**: $\text{base\_importance} + \text{narrative\_importance}$.
- $w_1, w_2$: Weights to balance relevance vs. salience (e.g., 0.7 vs 0.3).

### Selection Algorithm

1. Fetch all nodes for the target character.
2. Calculate Cosine Similarity for all nodes (using `pgvector` `<=>` operator).
3. Apply the formula.
4. Select top $K$ nodes (e.g., top 10) or all nodes with $\text{Score} > \text{Threshold}$.

## 4. Dynamic Importance (Salience)

The "Narrative Importance" allows the system to "focus" on attributes.

### 4.1. Automatic Adjustment

- **On Access**: When a node is retrieved and used in a response, slightly boost its `narrative_importance` (Reinforcement).
- **Decay**: Every turn (or session start), multiply `narrative_importance` by a decay factor (e.g., 0.95) to let old topics fade.

### 4.2. Governor-Driven Adjustment

The Governor can explicitly boost importance based on events.

- _Example_: Player picks up the "Cursed Amulet".
- _Action_: Governor sends update: `UPDATE profile_nodes SET narrative_importance = 1.0 WHERE path = 'inventory.amulet'`.
- _Result_: The amulet will now appear in prompts even for unrelated queries, ensuring the model remembers the character is holding it.

## 5. Example Flow

**Scenario**: Character `Eldrin` has `hair: "Silver"`, `eyes: "Blue"`, and `curse: "Touch turns gold to lead"`.

1. **Setup**:
   - Node `hair`: Content "Silver hair", Importance 0.1.
   - Node `eyes`: Content "Blue eyes", Importance 0.1.
   - Node `curse`: Content "Touch turns gold to lead", Importance **0.9** (High narrative relevance).

2. **User Input**: "What color are your eyes?"

3. **Retrieval**:
   - Query: "What color are your eyes?"
   - **Node `eyes`**:
     - Similarity: 0.9 (High match)
     - Importance: 0.1
     - _Score_: High. -> **INCLUDED**
   - **Node `hair`**:
     - Similarity: 0.2 (Low match)
     - Importance: 0.1
     - _Score_: Low. -> **EXCLUDED**
   - **Node `curse`**:
     - Similarity: 0.1 (Low match)
     - Importance: 0.9 (Very High)
     - _Score_: Medium-High (due to importance weight). -> **INCLUDED**

4. **Prompt Context**:

   ```text
   [Character Context]
   - Eyes: Blue eyes.
   - Curse: Touch turns gold to lead.
   ```

5. **Agent Response**: "My eyes are as blue as the summer sky... though I dare not touch the golden frame of your mirror, lest my curse take hold."

   _Result_: The agent answers the question but also weaves in the important narrative element (the curse) because it was in the context.

## 6. Implementation Roadmap

1. **DB Migration**: Add `profile_nodes` table with `vector` extension.
2. **Ingestion Service**:
   - Mapper: `Profile JSON` -> `Node[]`.
   - Embedder: `Node.content` -> `OpenAI/Ollama Embedding`.
3. **State Manager Integration**:
   - Hook into `updateCharacterState`. When a field updates, invalidate/re-embed the corresponding node.
4. **Retrieval Service**:
   - Implement the Hybrid Score query in SQL/Prisma.
