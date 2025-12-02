# Minimal RPG – Cross-Doc Design Audit

Cross-check of:

- Character Profile → LLM Integration
- Governor State Management & Orchestration
- Governor: Vector-Based Context Retrieval & Salience
- Items & Clothing Overview

Goal: identify collisions, conflicting designs, gaps, and concrete follow-up tasks.

---

## 1. Quick Map of Responsibilities

### 1.1 Character Profile → LLM Integration

- Defines how `CharacterProfile` schemas (basics, personality, appearance, scent, goals, style) are serialized into prompts.
- Owns `serializeCharacter`, `serializeSetting`, history summarization, and `buildPrompt`.
- Proposes a RAG layer via `CharacterTraitDocument` / `CharacterMemoryEvent` and `characterContext.ts` / `ragRetriever.ts` utilities.

### 1.2 Governor State Management & Orchestration

- Introduces templates vs instances pattern:
  - Templates in `character_profiles`, `setting_profiles`.
  - Instances in `character_instances`, `setting_instances` with `template_snapshot` and mutable `profile_json`.
- Governor orchestrates turns, calling agents and committing JSON Patch deltas back into `profile_json`.
- Suggests a `StateManager` package to abstract effective-profile retrieval and patch application.

### 1.3 Governor: Vector-Based Context Retrieval & Salience

- Treats effective profile as a set of "profile nodes" rather than a monolithic JSON.
- Proposes `profile_nodes` table with:
  - `path`, `content`, `embedding`, and salience fields (`base_importance`, `narrative_importance`).
- Hybrid scoring: similarity (query ↔ node) + importance to pick which nodes to include in prompts.

### 1.4 Items & Clothing Overview

- Designs relational item model (`items` + `item_owners`) with planned upgrade to per-instance items.
- Defines clothing-specific properties and attachment to character templates, character instances, and players.
- Outlines an `EffectiveOutfit` view and how to serialize outfits into prompts.
- Proposes future `items_vector` table and owner-centric/global item RAG.

---

## 2. Cross-Cutting Concepts & Where They Live

1. **Canonical character/setting state**
   - Governor docs treat `profile_json` in `*_instances` as the mutable source of truth per session.
   - Character–LLM integration doc talks about `CharacterProfile` schemas and assumes a single profile object passed into `serializeCharacter`.

2. **Prompt building**
   - Character–LLM integration owns `buildPrompt` and serialization rules.
   - Governor docs assume the Governor assembles context and then calls agents, but do not define exactly how `buildPrompt` participates.

3. **Vector / RAG layers**
   - Character–LLM integration: `CharacterTraitDocument` + `CharacterMemoryEvent` tables for character-centric RAG.
   - Governor vector doc: `profile_nodes` table, per-instance nodes with embeddings + salience.
   - Items & Clothing: separate `items_vector` for item embeddings.

4. **Items & inventory**
   - Items doc: items live in `items` / `item_owners` tables and are surfaced via an `EffectiveOutfit` view.
   - Governor vector doc examples use paths like `inventory.amulet` inside profile nodes, implying inventory might live inside `profile_json` as JSON.

5. **Dynamic narrative salience**
   - Character–LLM integration: proposes "weighted trait prioritization" as part of RAG and prompt selection.
   - Governor vector doc: has explicit `base_importance` + `narrative_importance` fields and decay.

---

## 3. Collisions & Conflicting Design

### 3.1 Duplicate Vector/RAG Schemas

**Symptom:**

- Character–LLM integration defines `CharacterTraitDocument` (traits, backstory paragraphs, goals, appearance features) plus `CharacterMemoryEvent`.
- Governor vector doc defines `profile_nodes` with `path`, `content`, `embedding`, and importance metrics.

**Issue:**

- These two designs overlap heavily: both want to break character state into textual chunks with embeddings and (optionally) importance/weights.
- Maintaining both would cause fragmentation (two tables, two ingestion pipelines, two retrieval mechanisms).

**Direction:**

- Consolidate on a single "knowledge node" abstraction (likely `profile_nodes` or a renamed/generalized version).
- Represent trait documents, backstory paragraphs, and appearance features as nodes, rather than a separate `CharacterTraitDocument` table.
- Represent dynamic memory events either as a second node type or as nodes with `kind = 'memory'` / `source = 'runtime'`.

### 3.2 Inventory Location: JSON vs Items Tables

**Symptom:**

- Governor vector examples reference paths such as `inventory.amulet` in `profile_nodes`, suggesting inventory is part of `profile_json`.
- Items doc models items as relational data (`items`, `item_owners`), and treats outfits/inventory as derived views, not embedded JSON.

**Issue:**

- Two competing representations of inventory: embedded JSON inside the character profile vs normalized item tables.
- If both exist, there will be drift: item changes via the relational model may not sync to `profile_json` and therefore to `profile_nodes`.

**Direction:**

- Decide on a single canonical representation for items/inventory:
  - Prefer: relational items (`items`, `item_owners`, later `item_instances`) as the source of truth.
- `profile_json` should not duplicate full inventory; at most it can reference item IDs or high-level flags.
- Any vectorized representation of items should be derived from the relational model (e.g., `items_vector`) rather than free-form JSON in profile state.

### 3.3 Multiple RAG Layers with Different Scoring Semantics

**Symptom:**

- Character–LLM integration RAG pitch: relevance-based retrieval by type (backstory, goals, traits, appearance), optional weighted traits.
- Governor vector doc: hybrid similarity + importance with temporal decay on `narrative_importance`.
- Items doc RAG: item-centric search without explicit importance fields, focusing on ownership scope.

**Issue:**

- Three slightly different scoring stories:
  - Trait docs with weights (but no formal salience field).
  - Profile nodes with importance + narrative_importance.
  - Items with pure similarity (plus implicit relevance from ownership filtering).

**Direction:**

- Standardize on a single scoring model at the retrieval layer:
  - Each node (character trait, memory, item, setting detail) exposes:
    - `similarity` to query
    - `importance` (static) and `narrative_importance` (dynamic)
  - Items can default to `importance = 0.5`, `narrative_importance = 0` unless boosted (e.g., cursed amulet).
- Retrieval services can then share the same hybrid scoring logic.

### 3.4 Prompt Builder Ownership and Layers

**Symptom:**

- Character–LLM integration assumes `buildPrompt` is the main entrypoint assembling system messages, character, setting, and history.
- Governor docs treat the Governor as the orchestrator that assembles effective state and context for agents and then calls them.

**Issue:**

- Potential overlap: who is responsible for calling RAG, selecting character/setting context, and performing summarization?
- Risk of double-work (Governor adds context, then `buildPrompt` adds another full profile or summary).

**Direction:**

- Clarify layering:
  - Governor: decides which entities (characters, settings, items) are relevant; asks state and retrieval services for their contexts.
  - Retrieval/State layer: returns structured contexts (effective profiles, retrieved nodes, outfits, memories).
  - Prompt layer (`buildPrompt` or agent-specific builders): turns these structured contexts into LLM messages.
- `buildPrompt` should be usable by the Governor as a lower-level formatting function, not as a top-level orchestrator of what is relevant.

### 3.5 Personality/Style Weighting vs Salience Fields

**Symptom:**

- Character–LLM integration proposes explicit weighted traits for personality and style but with no clear storage location.
- Governor vector doc defines `base_importance` / `narrative_importance` at node level.

**Issue:**

- Similar concept (trait importance) appears in two places without a unified scheme.

**Direction:**

- Store trait weights as `base_importance` on the corresponding profile nodes.
- Avoid introducing a separate weighting mechanism in the character RAG table.

### 3.6 Items in Vector Context vs Outfit Serialization

**Symptom:**

- Items doc: clothing is serialized via an `Outfit:` block injected into the character prompt; items RAG is mainly for scaling large inventories.
- Governor vector doc suggests important objects (e.g., cursed amulet) are represented as profile nodes.

**Issue:**

- Important items may be represented twice: once as outfit/inventory from `items` tables and once as profile nodes.

**Direction:**

- Keep items canonical in the items subsystem and vectorize them via `items_vector`.
- Governor vector retrieval for characters should be able to pull in items via an item retrieval service rather than treating them as profile nodes.
- Profile nodes should focus on intrinsic character/setting attributes; items are external but attached.

---

## 4. Gaps & Missing Glue

### 4.1 Player Entity in the Governor Model

- Items doc has an `owner_type = 'player'` with a future `players` table.
- Governor docs focus on `character_instances` and `setting_instances` but do not describe player state or how the Governor handles player-centric mutable data.

**Gap:**

- No defined schema or state management story for the player as a first-class entity.

**Need:**

- Decide whether the player is:
  - A special `character_instance`,
  - Or its own entity with a separate state document (`player_instances`),
  - And how items, memories, and vector nodes attach to it.

### 4.2 Embedding Lifecycle & Sync with JSON Patch

- State management doc explains JSON Patch against `profile_json` but not how vector representations stay in sync.
- Vector doc notes we should re-embed modified paths, but the exact integration with `updateCharacterState` is not specified.

**Gap:**

- No concrete lifecycle for:
  - When to create nodes.
  - When to re-embed nodes on patch application.
  - How to handle heavy update bursts.

**Need:**

- Clear pipeline:
  - On instance creation: decompose `profile_json` into nodes and embed.
  - On patch application: compute changed paths and re-embed only those nodes.
  - Optionally, background job for expensive re-embeds and a fallback for stale importance values.

### 4.3 Multi-Character & Multi-Agent Prompt Assembly

- Governor docs mention specialized agents (NPC Agent, Map Agent) and effective profiles but don’t define how multiple characters in a scene share context.
- Character–LLM integration currently serializes a single character plus setting.

**Gap:**

- No explicit pattern for multi-character scenes (e.g., two NPCs and the player in one conversation).

**Need:**

- Define how the Governor chooses:
  - Which characters are "active" in a turn.
  - How many characters' profiles are allowed into the prompt (token budget).
  - How RAG retrieval / profile nodes / outfits from multiple entities get merged into a coherent context block.

### 4.4 Items State vs Profile State Operations

- JSON Patch state updates are defined over `profile_json`.
- Items are in separate tables with their own lifecycles (ownership, equip/unequip).

**Gap:**

- No contract for how agents express item-related changes:
  - Does an agent return patches that modify `inventory` fields in JSON?
  - Or does it emit a separate `item_operations` block that the Governor interprets into `item_owners` changes?

**Need:**

- Define a dedicated item operation schema:
  - e.g., `[{ op: 'equip', itemId, slot }, { op: 'transfer', itemId, fromOwner, toOwner }]`.
- Keep JSON Patch focused on intrinsic profile fields, not relational inventory mutations.

### 4.5 Setting / World RAG vs Character RAG

- Character RAG is detailed; items RAG is scoped; vector doc is generalizable but examples are character-centric.

**Gap:**

- No clear story for large, complex settings (towns, regions, factions) using the same node / importance model.

**Need:**

- Extend the node design to a generic "subject" model (subject_type = character | setting | player | item | faction) and ensure retrieval for setting nodes is symmetrical to character retrieval.

### 4.6 Prompt Modes & Governor Integration

- Character–LLM integration proposes multiple prompt modes (`full`, `brief`, `goalsOnly`, `rag`) but doesn’t wire them into the Governor.

**Gap:**

- No decision about who picks the mode (Governor vs agent vs config) and under what conditions (e.g., long-running session vs short one-shots).

**Need:**

- Expose `promptProfileMode` as part of the Governor’s decision-making (based on history, token budget, or model type).

---

## 5. Suggested Unifications & Refactors

### 5.1 Unify RAG on a Single Node Model

**Proposal:**

- Adopt `profile_nodes` (renamed to something like `knowledge_nodes`) as the core RAG data structure.
- Fields:
  - `id`
  - `subject_type` (character, setting, player, item, etc.)
  - `subject_id`
  - `path` or `aspect` (e.g., `appearance.eyes`, `backstory.childhood`, `goal.longTerm`)
  - `kind` (trait, backstory, memory, item, lore)
  - `content`
  - `embedding`
  - `base_importance`, `narrative_importance`, `last_accessed_at`

**Implications:**

- `CharacterTraitDocument` is no longer needed as a separate table; its semantics become a subset of nodes.
- `CharacterMemoryEvent` can either be a dedicated table referencing nodes or a `kind = 'memory'` node type.
- `items_vector` can either:
  - remain a specialized table that feeds into the same retrieval scoring logic, or
  - become another set of nodes with `subject_type = 'item'`.

### 5.2 Clarify Canonical State Locations

**Proposal:**

- **Intrinsic state** (personality, backstory, appearance, relationships, etc.) stays in `profile_json` per instance.
- **Items/inventory/outfits** live in dedicated relational tables with clear foreign keys to characters/players/locations.
- `profile_json` may contain references or derived flags but not duplicated full item state.

**Result:**

- Governor StateManager manages JSON Patch for intrinsic state only.
- Item operations are handled by an `ItemService` with its own small operation schema.
- Vectorization:
  - Intrinsic state → nodes from `profile_json`.
  - Items → either `items_vector` or item nodes.

### 5.3 Standardize Retrieval & Scoring

**Proposal:**

- A single retrieval service that:
  - Accepts a query embedding + subject filter(s).
  - Outputs a list of nodes with `similarity`, `base_importance`, `narrative_importance`, and final score.
- Items retrieval uses the same engine but constrained to nodes/items owned by relevant entities.

**Result:**

- Consistent behavior regardless of what info is being retrieved (trait, memory, item, lore, setting fact).

### 5.4 Define Layering: Governor → State/RAG → Prompt

**Proposal:**

- **Governor:**
  - Decides which subjects are relevant (e.g., current NPC, player, current location, important item).
  - Decides prompt mode and token budget.
  - Calls StateManager and Retrieval services to obtain structured contexts.

- **State/RAG Services:**
  - Provide: effective profile(s), retrieved nodes, outfits, key items.

- **Prompt Builders:**
  - Convert structured contexts into text blocks: `Character Context`, `Setting Context`, `Outfit`, `Item Context`, `Memory Context`, etc.
  - `buildPrompt` becomes a thin formatter that takes these blocks and arranges them into messages.

**Result:**

- Clear separation of concerns; no double-serialization of profiles.

### 5.5 Formalize Item Operations

**Proposal:**

- Extend agent output schema with an `item_operations` array separate from JSON Patch:
  - `equip`, `unequip`, `give`, `take`, `create`, `destroy`, etc.
- Governor interprets `item_operations` via `ItemService` and updates `item_owners` (and `item_instances` later).

**Result:**

- Cleaner modeling of items and clothing as first-class domain entities.

### 5.6 Player State Model

**Proposal:**

- Introduce `player_profiles` and `player_instances` (or treat player as a special character template+instance).
- Ensure `owner_type = 'player'` in item ownership and nodes is backed by concrete tables and StateManager support.

**Result:**

- Symmetry between NPCs and the player in items, memories, and RAG.

---

## 6. Prioritized Action List

1. **Decide on the unified RAG data model**
   - Pick `profile_nodes` / `knowledge_nodes` as the canonical mechanism.
   - Decommission `CharacterTraitDocument` as a separate concept in design docs.

2. **Lock in canonical inventory representation**
   - Confirm items/inventory live in relational tables (`items`, `item_owners`, later `item_instances`).
   - Remove examples that suggest `inventory.*` lives in `profile_json`.

3. **Refactor design docs for consistency**
   - Update Character–LLM Integration to:
     - Assume `EffectiveProfile` comes from StateManager.
     - Reference the unified node model for RAG instead of a separate trait-doc schema.
   - Update Governor Vector doc to:
     - Call out that items are handled via their own subsystem but share the retrieval engine.

4. **Specify embedding lifecycle and integration with JSON Patch**
   - Define the hooks where StateManager triggers node re-embedding.
   - Document batch/background strategies for heavy updates.

5. **Define item operation schema and service contract**
   - Decide how agents express item changes.
   - Write a small spec for `ItemService` APIs (attach, detach, equip, unequip, transfer, etc.).

6. **Document layering & prompt modes**
   - Clarify the responsibilities of Governor vs Prompt Builder.
   - Decide initial `promptProfileMode` strategy and where that decision lives.

7. **Add Player entity plan**
   - Sketch `players` / `player_instances` and how they fit into StateManager, items, and RAG.

---

## 7. Open Questions to Resolve

1. **Should items be nodes or stay in a separate vector table?**
   - Pros of nodes: single retrieval engine and schema.
   - Pros of separate table: simpler, strongly item-focused queries and ownership scoping.

2. **How much of the profile should be decomposed into nodes?**
   - Everything (fine-grained control, more work) vs only backstory/goals/appearance/memories (good enough, simpler).

3. **Multi-character token budget strategy**
   - How many characters’ contexts can be included before we need secondary RAG for characters themselves?

4. **Runtime vs offline RAG updates**
   - Do we embed/refresh nodes synchronously with every patch or allow brief staleness?

5. **Agent responsibilities**
   - Should agents ever see full `profile_json` or only a pre-selected node subset + high-level summary?

These questions can each turn into their own small design spike once the high-level unifications above are accepted.
