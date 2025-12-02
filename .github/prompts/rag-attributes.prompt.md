We keep doing what we’re doing for **core identity**: always serialize a small, stable slice of the character (name, summary, core personality, a minimal appearance block with base attributes to assist with narration such as hair color, eye color, height, etc.).

- Move all the **granular stuff** (feet, jewelry, scars, specific outfit items, etc.) into:
  1. structured JSONB on the character (`profile_json.appearance`, `profile_json.meta`), and
  2. an item/outfit layer for clothing (boots, shoes, etc.) which is linked to the item_owners tables,
     and then

- Add a **RAG-ish retrieval step** that looks at the _current user message_ and pulls only the relevant nodes (e.g. anything tied to `appearance.legs` or an item in `slot: feet`) into a `Knowledge Context` / `Item Context` block **before** the narrative LLM call.

Below is how that fits into the codebase.

## 1. Where attributes live (data model)

We already have:

- `CharacterProfile.appearance` with nested parts (`hair`, `eyes`, `height`, `torso`, `arms`, `legs`, `features`, etc.), and an LLM-based extraction path from free-text into a structured partial `CharacterProfile` that gets merged into `profile_json` (JSONB).
- `character_instances.profile_json` as the canonical, mutable JSONB representation of the character for a session.

Future-facing docs also propose:

- An **items/outfits** model with clothing items, including `slot: feet`, and an `EffectiveOutfit` view exposed to the prompt builder. These slots link to their respective clothing item ids in the item_owners tables.
- A **knowledge-node** model that breaks `profile_json` into small nodes like `"appearance.eyes"` → `"Bright green eyes"` with embeddings + salience scores.

So for feet & footwear specifically, as an example, “best practice” is:

- **Feet as part of appearance**
  - Add a `feet` attribute and sub objects (e.g. `size`, `shape`, `notableFeatures`).
  - These get filled via the same **free-text → partial Appearance** extraction you already plan for hair/eyes/etc.

- **Footwear as items**
  - Represent boots/shoes/socks as `ItemDefinition` with `category: 'clothing'` and `slot: 'feet'`, linked to the character instance via `item_owners`.
  - At runtime, expose an `EffectiveOutfit` for the current character including `slot: 'feet'` items.

Everything ends up in **JSONB** (`profile_json` + item_owners tables), which will later feed both prompt-building and knowledge-node ingestion.

---

## 2. Always-on vs contextual attributes in the prompt

### 2.1 Always-on “core identity”

Your current prompt builder always includes a **Character block** and **Setting block** as `system` messages:

- Character block: name, age, summary, truncated backstory, personality, **appearance**, speaking style, style sliders, etc.
- Setting block: name, lore, themes/tags.

To keep the token budget sane but still give the model a stable mental picture, I’d:

- Keep **core identity fields always on**:
  - `name`, `age`
  - `summary`
  - first ~1200 chars of `backstory`
  - personality traits + speech style
  - **very compact appearance**: hair color/style, eye color, height, build, 2–3 distinctive features (but _not_ full outfit every turn).

Practically: update `serializeCharacter` to **prioritize** those appearance subfields and omit clothing/feet details from the always-on block. Those become “contextual”.

### 2.2 Contextual, on-demand attributes

The richer stuff (feet, shoes, tattoos, scars, jewelry, exact coat fabric) should _not_ live in the always-on block. Instead it should be surfaced via:

- **Knowledge-node RAG** for “body attributes” (appearance subpaths).
- **Item/Outfit retrieval** for clothing and carried gear.

Then you add dedicated system sections like:

```text
Knowledge Context:
- Legs/feet: Petite feet, narrow ankles, nails painted dark red.

Item Context:
- Feet: worn leather boots (adventurer style, scuffed but well-kept).
```

Those blocks appear **only when relevant** to the current turn.

### 2.3 How to Map Clothing to Appearance

Pure relational (my preferred)

Keep character → clothing linkage only in item_owners:

SELECT i.\*
FROM item_owners io
JOIN items i ON i.id = io.item_id
WHERE io.owner_type = 'character_instance'
AND io.owner_id = $characterInstanceId
AND io.equipped = true
AND io.equipped_slot = 'feet';

Then have an API helper (exactly what your doc suggests):

type EffectiveOutfit = {
equipped: Array<{ slot: ClothingSlot; item: ItemDefinition }>;
carried: ItemDefinition[];
};

async function getEffectiveOutfit(characterInstanceId: string): Promise<EffectiveOutfit> {
// query item_owners + items, group by equipped_slot
}

Your LLM pipeline never cares about IDs directly. It just calls:

const outfit = await getEffectiveOutfit(characterInstanceId);
// outfit.equipped.find(x => x.slot === 'feet')

And then serializes something like:

Feet: worn leather boots (adventurer style, leather, worn)

No duplication on profile_json, no risk of boots changing but your character JSON staying stale.

---

## 3. How retrieval decides what’s relevant

You already have a forward-looking design for retrieval and scoring:

- Break state into **nodes** with owner + path + content + embedding + importance.
- Combine **semantic similarity** (user query vs node content) with **salience** (`base_importance + narrative_importance`) into a final score.
- Inject the top-K nodes in a `Knowledge Context` block before history in the prompt.

For your concrete feet example, I’d define nodes like:

- `appearance.legs` → `"Long, muscular legs with a faint scar across the left ankle."`
- `appearance.feet` (if you add it) → `"Small feet, callused from walking barefoot as a child."`
- `outfit.feet` (derived from `EffectiveOutfit`) → `"Worn leather boots, laced to mid-calf, mud-splattered."`

Retrieval flow per turn:

1. **Build query** from:
   - Last user message (`"I look at her feet"`)
   - A small slice of recent context if desired.

2. **Search nodes** for the active `character_instance_id`:
   - Compute query embedding.
   - Run cosine similarity over nodes belonging to this character.
   - Combine with salience: e.g. `0.7 * similarity + 0.3 * (base + narrative_importance)`.

3. **Filter/Rank**:
   - Take the top K nodes where:
     - similarity is high to `"feet"`, `"boots"`, `"shoes"`, etc., **or**
     - salience is high (e.g. cursed boots) even if similarity is modest.

4. **Serialize**:
   - Turn those 1–3 nodes into short bullet points in a `Knowledge Context` / `Item Context` section that precedes conversation history in the prompt.

If you don’t have vectors yet, you can do a **first pass** with simple keyword matching over a small set of “attribute snippets” derived from `profile_json` + `EffectiveOutfit` stored in JSONB; then layer vectors in later.

---

## 4. Prompt shape with contextual attributes

Once you wire in RAG, your `buildPrompt` roughly looks like:

1. `BASE_RULES` (system)
2. Character block (system; only core identity + minimal appearance)
3. Setting block (system)
4. `Knowledge Context` (system; optional, from nodes)
5. `Item Context` (system; optional, from outfit/items)
6. `Context Summary (older turns)` (system)
7. Safety-mode system messages if needed
8. Recent user/assistant messages (verbatim)

That gives you:

- Stable **global view** (core identity + setting).
- **Dynamic zoom-in** (feet, boots, scars, etc.) only when relevant.
- A natural home for tons of micro-attributes without bloating every turn.

---

## 5. Example: “I look at her feet” – end-to-end

Let’s walk it:

1. **Authoring / storage**
   - Author writes `appearanceNotes`:

     > “She’s tall and willowy, with small feet and long toes she hides in scuffed leather boots.”

   - Attribute parser extracts a partial profile:

     ```jsonc
     {
       "appearance": {
         "height": "tall",
         "legs": { "length": "long" },
         "features": ["willowy build"],
       },
       "meta": {
         "appearanceNotesRaw": "She’s tall and willowy, with small feet and long toes...",
       },
     }
     ```

     …and you can extend the schema to also set e.g. `appearance.feet.size = "small"` later.

   - Outfit system creates an item:

     ```jsonc
     {
       "id": "boots_1",
       "name": "scuffed leather boots",
       "category": "clothing",
       "type": "boots",
       "properties": {
         "slot": "feet",
         "style": "adventurer",
         "condition": "worn",
         "material": "leather",
       },
     }
     ```

   - That item is owned & equipped by this `character_instance_id`.

2. **Knowledge-node ingestion**
   - You derive nodes from `profile_json` + items:
     - `appearance.height` → `"Tall and willowy."`
     - `appearance.legs` → `"Long, slender legs."`
     - `outfit.feet` → `"Scuffed leather boots, adventurer style."`

   - Compute embeddings and store `path`, `content`, `embedding`, `base_importance`, etc.

3. **Turn where user says:** `"I look at her feet."`
   - Build query string from this message (plus maybe last 1–2 turns).
   - Compute query embedding and score nodes. The `outfit.feet` and any `appearance.feet`/`appearance.legs` nodes float to the top via similarity + importance.

4. **Prompt assembly**
   - `Knowledge Context:`
     - `- Legs: Long, slender legs.`

   - `Item Context:`
     - `- Feet: Scuffed leather boots, adventurer style.`

5. **Narrative LLM sees**:
   - Core character + setting
   - Explicit hints about boots/feet when generating its reply, so it can write something like:

     > “Your gaze drops to her feet. Her long, slender legs vanish into scuffed leather boots, the toes darkened by old dust and travel.”

No need to always spam the entire wardrobe in every prompt.

---

## 6. Implementation roadmap (pragmatic)

If you want an incremental path:

1. **Now / Short term (no vectors yet)**
   - Ensure `appearance` and `meta.appearanceNotesRaw` are populated in `profile_json` via the extraction pipeline.
   - Implement an `EffectiveOutfit` helper backed by stub tables or even static JSON for a demo.
   - In the API route that builds prompts:
     - Look at the **raw user message** for simple regex keywords (`feet`, `shoes`, `boots`, `eyes`, etc.).
     - If matched, **directly read** the relevant subfields from `profile_json.appearance` / `EffectiveOutfit` and add a small `Knowledge Context` / `Item Context` block without any vector search.

2. **Near future**
   - Implement `profile_nodes` table and a simple ingestion job for character instances, following the knowledge-node doc.
   - Add a retrieval helper used by `buildPrompt` that:
     - Takes `sessionId`, latest user text, recent history.
     - Returns top K nodes as bullet points.

3. **Later**
   - Add salience updates when nodes are used (boost important facts like cursed boots).
   - Tune token budgets so knowledge/item context stays tiny but highly relevant.

---

If you want, next step we can design the exact **TypeScript interfaces** for:

- `AppearanceFeet` / `AppearanceLegs` additions,
- `EffectiveOutfit` for the prompt builder, and
- a small `getContextualAppearance(sessionId, userText)` helper that you can actually drop into `buildPrompt` right now without waiting for full RAG.
