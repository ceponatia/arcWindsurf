# Items & Clothing Overview

This document sketches how to introduce items (starting with clothing) into the Minimal RPG data model, database, and chat prompts.

The short-term goal is to:

- Represent clothing items in the database with rich descriptions and properties.
- Associate items with either a character template/instance or the player.
- Surface relevant clothing information in the LLM prompt so it influences narration and dialog.

The longer-term goal is to:

- Treat items as structured context that can be retrieved on-demand via RAG-style queries instead of always inlining full item details in the prompt.

## 1. Conceptual Model

We start with a simple, RDBMS-friendly model that can evolve. There are two layers of complexity to keep in mind:

### 1.1 Current/simple model (definition + owner)

This is the first version we will likely implement. It is optimized for both **LLM-friendly structure** and **database-friendly queries**:

- **Item** (generic): core definition of an item.
  - `id` (text, PK)
  - `name` (text, required)
  - `category` (enum-ish text, e.g. `clothing`, `weapon`, `trinket`)
  - `type` (text, free-form subtype, e.g. `coat`, `boots`, `hat`)
  - `description` (text, human-readable overview)
  - `slot` (text, nullable; denormalized index-friendly slot, e.g. `torso`)
  - `tags` (text[], nullable; denormalized index-friendly tags)
  - `properties_json` (jsonb, optional; canonical key/value properties)

- **Clothing-specific properties** (canonical, stored in `properties_json`):
  - `slot` (e.g. `head`, `torso`, `legs`, `feet`, `hands`, `accessory`)
  - `style` (e.g. `casual`, `formal`, `adventurer`, `mystic`)
  - `color` (free text or constrained palette)
  - `material` (e.g. `linen`, `leather`, `silk`)
  - `condition` (e.g. `pristine`, `worn`, `torn`)
  - `tags` (string[]; arbitrary flags such as `magical`, `ceremonial`, `stealthy`)

In this setup, `slot` and `tags` are **denormalized** onto real columns to support efficient queries like:

- "Find all equipped torso clothing for a character".
- "Find all magical items".
- "List all clothing items tagged `formal`".

`properties_json` still holds the canonical values, including `slot` and `tags`. Application code and migrations should treat `properties_json` as the source of truth and keep the denormalized columns in sync.

- **Item Ownership / Attachment**:
  - `owner_type` (enum: `character_instance`, `character_template`, `player`)
  - `owner_id` (text; FK to the corresponding table primary key)
  - `equipped` (boolean; whether actively worn/used vs just carried)
  - `equipped_slot` (text; mirrors clothing `slot` when relevant)

In this simple model, `items` is the definition and `item_owners` is just "who has what" plus `equipped` / `equipped_slot`. Mutable-sounding fields like `condition` live in `properties_json` on the item definition, which means:

- If two characters both have `coat_of_many_colors`, they share the same `condition` and other mutable properties.

This is acceptable for early experiments but becomes limiting if we ever want truly separate copies.

### 1.2 Richer model (definition + instance + owner)

If we want any of the following:

- Different condition per copy (Aria’s coat is torn, an NPC’s identical coat is pristine).
- Renamed copies ("Gomgar’s Favorite Coat" vs generic "long crimson coat").
- Durability / charges / enchantments differing per instance.

…then we need an extra layer between definition and owner:

- **ItemDefinition** (current `items` table):
  - What the item is in the abstract: base `name`, base `description`, base `properties_json` (including default `condition`, tags, etc.).

- **ItemInstance** (new table, one row per physical copy):
  - `id` (text, PK).
  - `definition_id` (FK → `items.id`).
  - `custom_name` (nullable; per-copy override like "Gomgar’s Favorite Coat").
  - `instance_properties_json` (jsonb; per-copy overrides and mutable state such as actual `condition`, remaining charges, temporary enchantments).

- **ItemOwner** (updated join table, now points at instances):
  - `item_instance_id` (FK → `item_instances.id`, instead of `item_id`).
  - `owner_type` / `owner_id` as before.
  - `equipped`, `equipped_slot` as before.

With this structure:

- Two characters can carry coats from the same definition while having different `condition`, `custom_name`, or enchantments.
- Ownership changes (`ItemOwner` rows) move an `ItemInstance` between owners without losing its history/state.
- Prompt/RAG serializers can resolve `ItemInstance → ItemDefinition` and merge base + instance properties into a single view for narration.

We will likely start with the simpler definition+owner model and upgrade to the definition+instance+owner model once we add features that require true per-copy state.

## 2. Database Sketch

We can extend `packages/db/sql/001_init.sql` with two new tables when we are ready:

- `items` — catalog of all items (including clothing).
- `item_owners` — attachment/ownership join table.

Example (high level, not yet applied):

```sql
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,         -- e.g. 'clothing'
  type TEXT NOT NULL,             -- e.g. 'coat', 'boots'
  description TEXT NOT NULL,
  properties_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_owners (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL,       -- 'character_instance' | 'character_template' | 'player'
  owner_id TEXT NOT NULL,         -- FK into the corresponding table
  equipped BOOLEAN NOT NULL DEFAULT false,
  equipped_slot TEXT,             -- optional; e.g. 'torso', 'head'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_owners_owner
  ON item_owners(owner_type, owner_id);
```

### 2.1 Constraints & type hardening

To keep the model robust as the world grows, we can layer on a few constraints without changing the core table shapes.

#### Unique equipped slot per owner

Most characters should not have two torso items equipped at once (unless we later invent layered slots like `torso_inner` / `torso_outer`). We can enforce "at most one equipped per slot per owner" with a partial unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_equipped_per_slot
   ON item_owners (owner_type, owner_id, equipped_slot)
   WHERE equipped = true AND equipped_slot IS NOT NULL;
```

If we later add a `layer` column to support multiple layers (e.g. shirt + coat), we can extend the uniqueness constraint to:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_equipped_per_slot_layer
   ON item_owners (owner_type, owner_id, equipped_slot, layer)
   WHERE equipped = true AND equipped_slot IS NOT NULL;
```

#### Enum-ish `owner_type`

In the initial sketch, `owner_type` is `TEXT`. That works, but typos will silently break lookups (e.g. `character-instances` vs `character_instance`). As a hardening step we can introduce a proper enum:

```sql
CREATE TYPE owner_type AS ENUM (
   'character_instance',
   'character_template',
   'player'
);
```

And then update the table definition to use it:

```sql
owner_type owner_type NOT NULL
```

This keeps `item_owners` queries predictable and fails fast if we accidentally use an unsupported owner kind.

We can still split `item_owners` into separate join tables per owner type in the future if we find that helpful for indexing or permissions.

## 3. API & Types (Planned)

In `packages/api/src/types.ts` we will introduce strongly-typed representations that clearly separate **item definitions**, **ownership**, and **prompt-ready views**.

- `ItemCategory = 'clothing' | 'weapon' | 'trinket' | ...`
- `ClothingSlot = 'head' | 'torso' | 'legs' | 'feet' | 'hands' | 'accessory'`
- `OwnerType = 'character_instance' | 'character_template' | 'player'`
- `ItemProperties` (base) with `ClothingProperties` specialization.

### 3.1 Definition vs owner DTOs

Even in the initial “definition + owner” model (before adding true instances), API-facing types should clearly distinguish **what an item is** from **who owns it**:

```ts
export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  type: string;
  description: string;
  properties: ItemProperties; // derived from properties_json
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

For clothing, we will likely add a `ClothingItem` type that refines `ItemDefinition` with `category: 'clothing'` and a `properties` shape including `slot`, `style`, `color`, etc.

### 3.2 Prompt-facing “effective outfit” types

Prompt builders should not have to deal with joins or database details. Instead, the API will expose an already-resolved view of clothing:

```ts
export interface EffectiveClothingSlot {
  slot: ClothingSlot;
  item: ItemDefinition; // or ClothingItem
}

export interface EffectiveOutfit {
  equipped: EffectiveClothingSlot[];
  carried: ItemDefinition[]; // or ClothingItem[]
}
```

`serializeCharacter` and related prompt helpers will consume `EffectiveOutfit` directly, focusing only on how to describe the outfit, not how to query or join data.

### 3.3 Zod schemas and discriminated unions

We will also define minimal Zod schemas in `@minimal-rpg/schemas` so that clothing items can be validated when loaded from the DB or any seed JSON in `data/`.

To get strong type narrowing, item schemas will use a discriminated union on `category`. For clothing, for example:

```ts
const BaseItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['clothing', 'weapon', 'trinket']),
  type: z.string(),
  description: z.string(),
  properties: ItemPropertiesSchema,
});

export const ClothingItemSchema = BaseItemSchema.extend({
  category: z.literal('clothing'),
  properties: ClothingPropertiesSchema,
});
```

Code that checks `category === 'clothing'` will then automatically see `properties` narrowed to `ClothingProperties`, making both validation and prompt construction safer.

## 4. Associating Clothing to Characters / Player

We will support three attachment flows:

1. **Character template → clothing**
   - Attach clothing directly to a character template so _all_ sessions that use that template start with those items (e.g. "Aria always wears a crimson coat").
   - This would use `owner_type = 'character_template'` and `owner_id = character_templates.id`.

2. **Character instance → clothing**
   - Grant or modify clothing on a per-session basis, enabling loot, outfit changes, and narrative events.
   - Uses `owner_type = 'character_instance'` and `owner_id = character_instances.id`.
   - This is the main path for dynamic story changes.

3. **Player → clothing**
   - Track items related to the player avatar separately from NPCs.
   - Uses `owner_type = 'player'` and `owner_id` pointing to a `players` table (to be introduced alongside items).

Because `item_owners` is separate from `items`, a single `coat_of_many_colors` definition can be re-used across multiple characters or players if desired.

## 5. Prompt Integration (Short Term)

Initially, before we build contextual RAG around items, we will surface clothing directly in the system prompt.

### 5.1. Effective Clothing View

When building the prompt for a session, the API will:

1. Load the character instance (including its template snapshot) as it does today.
2. Query `item_owners` for all owners matching:
   - `(owner_type = 'character_instance' AND owner_id = :characterInstanceId)`
   - _(optionally)_ `(owner_type = 'player' AND owner_id = :playerId)` for player gear.
3. Join to `items` and deserialize `properties_json`.
4. Build an "effective outfit" view:
   - A list of equipped clothing items by slot.
   - A list of carried (not equipped) clothing, if relevant.

### 5.2. Serializing Clothing into the Prompt

We will extend the existing `serializeCharacter` helper in `packages/api/src/llm/prompt.ts` to accept an optional `clothing` argument (or to read clothing from an extended `CharacterProfile`-like DTO on the API side).

Example text snippet appended to the character serialization:

```text
Outfit:
- Torso: long crimson coat (formal, wool, pristine)
- Legs: fitted black trousers (casual)
- Feet: worn leather boots (adventurer style)

Carried Clothing:
- Spare cloak (dark gray, travel-worn)
```

Guidelines for the serializer:

- Keep each line concise: name first, then key properties in parentheses.
- Limit to a small number of items and characters to avoid overloading the prompt.
- Prefer currently equipped items over carried ones.

On the system/character prompt side, we will add explicit guidance such as:

> Outfit describes what {{char}} is currently wearing and should be referenced naturally in narration and dialogue. Do not contradict the outfit description unless the story explicitly involves changing clothes.

When serializing clothing into text, the serializer should:

- Hard-cap the number of lines (e.g. **4–6 equipped** items, and **3–4 carried** items at most).
- Sort equipped items by slot order: `head → torso → legs → feet → hands → accessory`.
- Emphasize distinctive features first in the parenthetical details: usually **color**, then **style**, then **condition** (e.g. `long crimson coat (formal, pristine wool)`).

### 5.3 Avoid double-describing appearance vs clothing

Static character appearance already covers hair/eyes/body. Clothing will now be modeled as a separate, dynamic concept via `Outfit`. To avoid contradictions:

- Do **not** bake detailed clothing into the static appearance description anymore.
- If you still want to mention “signature” items in appearance, keep it generic (e.g. "often seen in a crimson coat") and treat `Outfit` as the **source of truth** for what the character is wearing **right now**.

This keeps the model from seeing conflicting statements like:

- `Appearance: always wears a pristine crimson coat`
- `Outfit: Torso: long crimson coat (worn, torn)`

Clothing in `Outfit` should always win when the two disagree, because it reflects the current narrative state.

## 6. Future: Item-Aware RAG

Once the core schema and serialization are stable, we can move clothing and other items into a RAG pipeline so they do not always need to be inlined in full in the system prompt.

The high-level flow:

1. **Vectorization**
   - For each item, construct a canonical **embedding string** from its structured properties. For example:

     ```text
     long crimson coat; category: clothing; slot: torso; style: formal; material: wool; condition: worn; tags: ceremonial, noble; often worn by Aria in court
     ```

     This string is derived from `ItemDefinition.properties` (plus any optional per-item notes) in a stable, predictable order.

   - Store the resulting embedding vector in a dedicated `items_vector` table via `pgvector`, alongside `item_id` (and, later, any other keys we need).
   - Optionally, add a `usage_notes` field in the item JSON/DB that can be appended to the embedding string to capture hints like "helpful for cold weather" or "enhances stealth in shadows".

2. **Querying**
   - Before each model call, derive a query string from the latest user message and/or scene context.
   - Support two main RAG modes:
     - **Owner-centric lookup** (most common):
       - Start from `item_owners` filtered by `owner_type` / `owner_id` (e.g. the current character or party).
       - Join to `items` (and `items_vector`) and run similarity search **within only those items** to find the most relevant equipped/carried gear.
     - **Global item lookup** (less common):
       - Run similarity search over **all** items in `items_vector` for queries like "fire resistance" or "courtly apparel".
       - After retrieving candidates, filter down to items available to the party or currently present in the scene.

3. **Context Assembly**
   - Turn the retrieved items into a compact bullet list like the current `Outfit:` section.
   - Inject that into the prompt as a separate system message, e.g. `Item Context:`.

4. **Fallback / Hybrid Mode**
   - For core, always-relevant clothing (signature outfits), we may still inline them directly in the character description.
   - Additional or situational items come from RAG, allowing the context window to scale better as inventories grow.

The schema and ownership design described earlier (definition + owner, and later definition + instance + owner) already supports both owner-centric and global lookup modes without additional structural changes.

## 7. Implementation Order (Suggested)

1. **Schema & Types**
   - Add DB tables (`items`, `item_owners`) in a new migration.
   - Introduce item/clothing types and Zod schemas in `@minimal-rpg/schemas`.
   - Add DTOs and mappers in `packages/api/src/types.ts` and `packages/api/src/mappers`.

2. **Basic CRUD & Seeding**
   - First vertical slice:
     - Add a migration that creates both `items` and `item_owners`.
     - Seed one demo character instance and attach 2–3 clothing items to them.
     - Implement an API helper `getEffectiveOutfit(characterInstanceId): EffectiveOutfit` that resolves equipped + carried clothing from the DB.
     - Wire `getEffectiveOutfit` into `serializeCharacter` and inspect the raw prompt output.
   - Use that prompt output to quickly iterate on:
     - Level of detail per line (more/less adjectives, which properties to show).
     - Whether to wrap the section in explicit tags (e.g. `[OUTFIT]…[/OUTFIT]`).
     - The section heading (e.g. `Outfit:` vs `Inventory:`) and positioning within the overall system prompt.

3. **Prompt Wiring (non-RAG)**
   - Extend `buildPrompt` / `serializeCharacter` to include an `Outfit` section sourced from the DB.
   - Verify prompt output via the existing test harness/LLM logs.

4. **RAG Preparation**
   - Define an `items_vector` table and embedding pipeline (likely reusing existing `pgvector` helpers).
   - Add dev-only tools to inspect nearest-neighbor results.

5. **RAG Integration**
   - Switch from unconditional clothing inlining to RAG-driven `Item Context` when appropriate.

This document is intentionally high-level; the next step will be to formalize the exact types and migrations in `packages/db` and `@minimal-rpg/schemas`, starting with clothing as our first concrete item category.
