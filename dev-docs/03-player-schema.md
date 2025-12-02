# Player Schema

This document outlines how the Minimal RPG system currently treats the "Player" concept and how a future explicit player schema is expected to evolve. The production design assumes players will be first-class entities; the current runtime has not implemented that layer yet.

## Current Status

**State (current runtime):** Implicit / Not Implemented.

The current implementation treats the player as the user of the session rather than as a first-class game entity:

- **User Identity** is managed via the `user_sessions` table (session ID).
- There is no dedicated database table or schema definition for a player character or user profile beyond the session metadata.

## Player Avatar (Planned First-Class Entity)

The production version of Minimal RPG is expected to include a first-class player avatar (a character the user "plays as"), backed by its own schema and persistence layer:

- A player avatar will be modeled using the existing `CharacterProfileSchema` from `@minimal-rpg/schemas` (or a strict extension of it), plus additional semantics applied at runtime (e.g., ownership, permissions, inventory links).
- The same validation and data loading mechanisms used for NPCs will apply to a player avatar, but players will also have dedicated storage (for example, player-focused tables or documents) rather than being inferred only from `user_sessions`.

## Inventory, Items, and Outfits (Planned)

An inventory system has been discussed but is not currently implemented in code:

- **Inventory/Items**: There is no runtime support yet.
- Historical design ideas are captured in `dev-docs/06-items-inventory-and-outfits.md` and older archive notes, but they are not authoritative and should be treated as exploratory.

The forward-looking design assumes that both NPCs and players will share the same **item/outfit model**:

- Items are defined once (for example, boots, coats, jewelry) and attached to owners via an `item_owners` table.
- Each player avatar is a first-class owner (`ownerType: 'player'`) that can hold and equip items, just like a `character_instance`.
- Prompt builders consume an `EffectiveOutfit` view (per character or player) that resolves the currently equipped items per slot (for example, `slot: 'feet'`).

From a RAG and prompting perspective:

- The player’s **core identity** (name, summary, minimal appearance, core personality) will continue to be serialized into a compact character-like block.
- Detailed clothing and gear (for example, "worn leather boots", "long crimson coat") live in item definitions and are exposed via `EffectiveOutfit` and item-aware knowledge nodes.
- When the user examines the player avatar (for example, "I look at my boots"), retrieval logic can:
  - Look up the player’s equipped items from `item_owners` and `items`.
  - Optionally run vector retrieval over item embeddings.
  - Inject a small `Item Context` block into the prompt with only the relevant outfit details for that turn.

Any future player schema that includes equipment, inventory, or currency should therefore align with the shared item/outfit design rather than duplicating clothing fields inside the player profile.

## Open Questions

Several aspects of a future player schema remain intentionally undecided:

- **Player Stats**: Will the player have stats (HP, XP, attributes, etc.)? If so, where will they be stored (dedicated table vs. embedded JSON state)?
- **Inventory System**: How will items be defined, persisted, and associated with a particular player or avatar?
- **Relationships**: How will relationships between the player and NPCs be tracked—explicitly (e.g., separate tables/fields) or implicitly (e.g., via chat history or extended profile state)?

These questions should be revisited when the design requires a first-class player entity rather than treating the user purely as an external agent.
