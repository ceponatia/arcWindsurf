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

## Inventory and Items

An inventory system has been discussed but is not currently implemented in code:

- **Inventory/Items**: There is no runtime support yet.
- Historical design ideas are captured in `dev-docs/archive/items-and-clothing.md`, but they are not authoritative and should be treated as exploratory notes.

Any future player schema that includes equipment, inventory, or currency will need to coordinate with whatever item schemas are eventually introduced.

## Open Questions

Several aspects of a future player schema remain intentionally undecided:

- **Player Stats**: Will the player have stats (HP, XP, attributes, etc.)? If so, where will they be stored (dedicated table vs. embedded JSON state)?
- **Inventory System**: How will items be defined, persisted, and associated with a particular player or avatar?
- **Relationships**: How will relationships between the player and NPCs be tracked—explicitly (e.g., separate tables/fields) or implicitly (e.g., via chat history or extended profile state)?

These questions should be revisited when the design requires a first-class player entity rather than treating the user purely as an external agent.
