# Items, Inventory, and Outfits

**Status**: Proposed / Not Implemented
**Last Updated**: December 2025

This document describes a proposed design for an items and inventory system (starting with clothing). As of this writing, **no item or inventory support exists in the live code or database schema**; everything below is future-facing.

## Goals

1. **Represent items** in the database with rich descriptions and properties.
2. **Associate items** with characters (templates or instances) and the player.
3. **Surface clothing and gear** in the LLM prompt so it can influence narration and dialog.
4. **Prepare for RAG** so large inventories can be retrieved contextually instead of always inlined.

## 1. Conceptual Model (Proposed)

The design uses a **definition + owner** model:

- **Item definition** – what the item is in the abstract.
- **Ownership/attachment** – who currently has the item and whether it is equipped.

There is no implementation of these concepts in the current codebase yet; they are included here to guide future work.

### 1.1 Item definition

The core definition of an item ("what it is") would include:

- **id** – unique identifier.
- **name** – display name (for example, "Long Crimson Coat").
- **category** – broad classification (for example, `clothing`, `weapon`, `trinket`).
- **type** – subtype (for example, `coat`, `boots`).
- **description** – human-readable text.
- **properties** – JSON object for category-specific data (for example, `slot`, `material`, `color`).

### 1.2 Item ownership

Ownership attaches item definitions to entities:

- **ownerType** – one of `character_instance`, `character_template`, or `player`.
- **ownerId** – identifier for the owning entity.
- **equipped** – boolean flag indicating whether the item is actively worn/used.
- **equippedSlot** – where it is worn (for example, `torso`, `head`) when applicable.

### 1.3 Clothing-specific fields

Clothing items would add more detailed properties inside the `properties` object:

- **slot** – one of `head`, `torso`, `legs`, `feet`, `hands`, `accessory`.
- **style** – for example, `casual`, `formal`, `adventurer`.
- **material** – for example, `wool`, `leather`, `silk`.
- **condition** – for example, `pristine`, `worn`, `torn`.

These values would be used by prompt builders to describe outfits in a compact, consistent way.

## 2. Database sketch (Proposed)

No item- or inventory-related tables exist in the current migration file [packages/db/sql/001_init.sql](packages/db/sql/001_init.sql). When we are ready to implement items, a migration can introduce tables along these lines:

```sql
-- Catalog of all item definitions
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,         -- 'clothing', 'weapon', etc.
  type TEXT NOT NULL,             -- 'coat', 'boots'
  description TEXT NOT NULL,
  properties_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ownership / attachment join table
CREATE TABLE IF NOT EXISTS item_owners (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL,       -- 'character_instance', 'character_template', 'player'
  owner_id TEXT NOT NULL,         -- application-level FK
  equipped BOOLEAN NOT NULL DEFAULT false,
  equipped_slot TEXT,             -- 'torso', 'head', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_owners_owner
  ON item_owners(owner_type, owner_id);

-- Ensure one equipped item per slot per owner
CREATE UNIQUE INDEX IF NOT EXISTS uniq_equipped_per_slot
  ON item_owners (owner_type, owner_id, equipped_slot)
  WHERE equipped = true AND equipped_slot IS NOT NULL;
```

These shapes mirror the existing session and profile tables in [packages/db/sql/001_init.sql](packages/db/sql/001_init.sql) but are **not** present there yet.

## 3. API and types (Proposed)

There are currently **no** item-related types in [packages/api/src/types.ts](packages/api/src/types.ts) or [packages/schemas/src](packages/schemas/src). When items are implemented, we expect at least:

### 3.1 Domain types

```ts
export type ItemCategory = 'clothing' | 'weapon' | 'trinket';
export type ClothingSlot = 'head' | 'torso' | 'legs' | 'feet' | 'hands' | 'accessory';
export type OwnerType = 'character_instance' | 'character_template' | 'player';

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  type: string;
  description: string;
  properties: ItemProperties; // discriminated by category
}

export interface ItemOwner {
  id: string;
  itemId: string;
  ownerType: OwnerType;
  ownerId: string;
  equipped: boolean;
  equippedSlot?: ClothingSlot;
}
```

### 3.2 Prompt-facing outfit view

Prompt builders should not need to know about joins or DB details. A higher-level view can be exposed from the API:

```ts
export interface EffectiveOutfit {
  equipped: Array<{ slot: ClothingSlot; item: ItemDefinition }>;
  carried: ItemDefinition[];
}
```

The LLM prompt code can then work only with `EffectiveOutfit` instead of raw tables.

## 4. Prompt integration (Proposed)

The current prompt builder in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts) does **not** include any explicit notion of items or outfits. Once items exist, we plan to:

1. Resolve an `EffectiveOutfit` for the active character (and optionally the player) from the database.
2. Use that outfit data in two ways:

- A compact **always-on** summary, if needed, for extremely iconic items.
- Primarily as input to **RAG-style retrieval**, producing small, turn-local `Item Context` sections when the player interacts with clothing or gear.

Example contextual text layout:

```text
Item Context:
- Torso: long crimson coat (formal, wool, pristine).
- Feet: worn leather boots (adventurer style, scuffed but well-kept).
```

Guidelines for the serializer and retrieval (once implemented):

- Treat `EffectiveOutfit` as the source of truth for current clothing, even if appearance text also mentions clothes.
- Keep descriptions short and structured: `Slot: name (key properties)`.
- Only include outfit bullets when they score as relevant to the current user message (for example, "I look at her boots"), so most turns carry **no** `Item Context` at all.
- Limit the number of items per turn to avoid bloating the prompt (for example, at most 3–4 contextual outfit bullets).

## 5. Future: item-aware RAG (Proposed)

Although pgvector is already enabled in the database, no item vectors or RAG pipelines exist today. For items, a future iteration could:

1. Build embedding strings from item definitions and properties.
2. Store embeddings in a dedicated `items_vector` table.
3. Query for relevant items based on the latest user message and scene context, either:
   - **Owner-centric** (search within items owned by the party), or
   - **Global** (search across all items, then filter by availability).
4. Inject only the most relevant items into the prompt under an `Item Context` section.

This would let inventories grow without permanently occupying prompt space.

## 6. Implementation plan (Proposed)

These steps are not started yet; they are a suggested order of work:

1. **Schema and DB** – add migrations for `items` and `item_owners`.
2. **Schemas and types** – introduce Zod schemas and strongly typed TS interfaces in `@minimal-rpg/schemas` and the API.
3. **Seeding** – define a few example clothing items and attach them to a demo character in seed scripts.
4. **API helpers** – implement a `getEffectiveOutfit(sessionId | characterInstanceId)` helper that resolves `EffectiveOutfit`.
5. **Prompt wiring** – extend the prompt builder to include an Outfit section based on `EffectiveOutfit`.
6. **Optional RAG** – once the basics are stable, add item embeddings and retrieval for larger inventories.

## 7. TBD / Open questions

These areas are intentionally left open until we start implementing the system:

- Exact file format and location for any item seed data (for example, whether to mirror `data/characters` / `data/settings`).
- How much of the item model should be exposed to the web client versus kept server-side only.
- Whether clothing should also be modeled as part of the structured appearance schema in [packages/schemas/src/character/appearance.ts](packages/schemas/src/character/appearance.ts) or remain separate.
- Any performance constraints from adding outfit details to every prompt.
