# Location Maps and Navigation

This document sketches how Minimal RPG could represent a "map" of locations so that when a user leaves one location via a direction or other navigation cue, they arrive at another location.

The goal is **not** to prescribe a final implementation, but to explore design options compatible with the existing schemas and LLM-driven narrative.

## 1. Concepts and Scope

We now have basic schemas for `Region`, `Building`, and `Room` with descriptive text and categorical fields. A navigation system should:

- Treat each location (region / building / room) as a **node** in a graph.
- Represent **edges** between nodes: e.g., `north` from Room A leads to Room B.
- Support both **directional navigation** (north/east/up/down) and more abstract transitions ("enter tavern", "leave city gates").
- Remain **LLM-friendly**: the map constrains what moves are available, while the LLM handles the narrative of moving and arriving.

We want something that can power:

- A simple **text adventure style** movement layer.
- UI affordances like clickable exits / links.
- Future features such as fog-of-war, locked doors, or one-way passages.

## 2. Core Data Model: Graph of Location Nodes

At a high level, we can model navigation as a graph:

- **Node**: a `LocationNode` representing a specific place the player can stand.
- **Edge**: a `LocationLink` that connects two nodes with:
  - A **direction** or **label** (e.g., `north`, `upstairs`, `into_tavern`).
  - Optional **conditions** (e.g., requires key, not flooded, etc.).

### 2.1. Location Nodes

We can define a neutral node type that points back to a concrete schema:

- `kind`: `'region' | 'building' | 'room'`
- `refId`: the `id` of the underlying `Region`, `Building`, or `Room`.
- Optional overrides / metadata (e.g., whether this node is a "starting" position).

This avoids duplicating descriptive data in the map while still letting us map arbitrary subsets of location records.

### 2.2. Location Links

Each link describes a possible transition:

- `fromNodeId`: ID of the node you are in.
- `toNodeId`: ID of the destination node.
- `mode`: `'direction' | 'action' | 'portal' | 'implicit'` (for UI / LLM prompts).
- `label`: the text-ish label shown to the player (e.g., `"Go north"`, `"Enter tavern"`).
- `direction?`: if `mode === 'direction'`, from a small enum (`'north'`, `'south'`, `'east'`, `'west'`, `'up'`, `'down'`, etc.).
- `conditions?`: optional structured conditions (flags, items, etc.).
- `isOneWay?`: if true, movement is one-way.

This is intentionally generic so that a single structure can support both direction-based and more narrative-style navigation.

## 3. Data Placement Options

There are two main places we could store map data:

### Option A: Dedicated Map JSON Files

- New directory, e.g. `data/maps/` with one or more files:
  - `world.json`, `dungeon_1.json`, etc.
- Each file defines:
  - `nodes: LocationNode[]`
  - `links: LocationLink[]`

Pros:

- Keeps navigation separate from content definitions.
- Multiple maps (campaigns, scenarios) can re-use the same `Region/Building/Room` records.
- Easy to swap or version maps without touching base location files.

Cons:

- Indirect: harder to see connections when editing a single room/building.

### Option B: Embedded Exits in Location Records

- Extend `Room`, `Building`, possibly `Region` schemas with an `exits` field:
  - `exits: ExitDefinition[]`
- Each exit references another location and optionally a direction.

Pros:

- Simple mental model: open a room file, see its exits.
- Good for smaller maps.

Cons:

- Harder to share nodes across multiple scenarios.
- Risk of circular references or inconsistencies if edited manually.

### Hybrid Approach

- Keep base schemas clean (no exits).
- Map files refer to `Region/Building/Room` via `refId`.
- Optionally allow overrides per scenario (e.g., a door blocked in one scenario).

This hybrid approach is likely best for Minimal RPG because scenarios and campaigns are intended to be composable on top of base content.

## 4. Integration with Sessions and LLM

### 4.1. Session State

A session would track the player's current location as a node reference:

- `currentNodeId`: where the player is standing.
- `visitedNodeIds`: optional history for exploration / achievements.

When the player chooses a movement action:

1. Server looks up `LocationNode` for `currentNodeId`.
2. Filters `LocationLink` objects where `fromNodeId === currentNodeId` and conditions are met.
3. If the requested direction/label matches one of these links, update `currentNodeId` to `toNodeId`.
4. Fetch the underlying `Region/Building/Room` referenced by `toNodeId`.
5. Call the LLM with:
   - The new location's `description` as primary context.
   - Additional fields (climate, terrain, type, size, tags, etc.) as structured guidance.
   - The fact that the player _moved_ via a specific link.

### 4.2. Exposing Navigation Options to the Player

On each turn, the API can compute `availableExits` from the map:

- For direction-based exits, present buttons like `North`, `South`, `Upstairs`.
- For action-based exits, present labeled actions like `Enter tavern`, `Leave city gates`.

The LLM can still generate freeform narrative suggestions, but the system decides which movements actually change location state.

## 5. Direction and Navigation Semantics

### 5.1. Direction Enum

We should keep a small, clear enum for map directions:

- `north`, `south`, `east`, `west`, `northeast`, `northwest`, `southeast`, `southwest`, `up`, `down`, `in`, `out`.

This aligns well with classics but can also support verticality and simple in/out transitions.

### 5.2. Non-directional Navigation

Some transitions are better described narratively than directionally:

- "Climb into the attic".
- "Step through the portal".
- "Enter the tavern".

For these, we rely primarily on the `label` and `mode === 'action' | 'portal'`, and do not set `direction`.

## 6. Condition System for Links (Future Work)

To support more game-like behavior, link conditions can be layered in gradually:

- Simple flag checks:
  - `requiresFlag: 'door_unlocked'`.
- Inventory requirements:
  - `requiresItem: 'rusty_key'`.
- State-based:
  - `onlyIf: { timeOfDay: 'night' }`.

The LLM does **not** decide whether the player can move; it reacts to the system's decision and narrates the consequences.

## 7. Validation and Tooling

Because the project already uses Zod-based schemas and a loader:

- Define `LocationNodeSchema` and `LocationLinkSchema` under `packages/schemas/src/location/` or `src/api/`.
- Add a `MapSchema` that bundles `nodes` and `links`.
- Extend `validate-data.js` (or a similar script) to validate map JSON files.
- Consider simple graph checks:
  - All `fromNodeId` and `toNodeId` exist.
  - No obvious typos in `direction` strings (enforced by enum).
  - Optional connectivity checks (e.g., ensure a starting node is reachable to key areas).

## 8. Example Sketch (Conceptual)

Conceptual structure for a small inn:

- Nodes:
  - `inn_outside` → `kind: 'building', refId: 'inn_exterior'`.
  - `inn_common_room` → `kind: 'room', refId: 'inn_common_room'`.
  - `inn_room_1` → `kind: 'room', refId: 'inn_room_1'`.

- Links:
  - Outside to common room: `mode: 'action', label: 'Enter the inn'`.
  - Common room to outside: `mode: 'action', label: 'Leave the inn'`.
  - Common room to room 1: `mode: 'direction', direction: 'up', label: 'Go upstairs to your room'`.
  - Room 1 to common room: `mode: 'direction', direction: 'down', label: 'Go downstairs to the common room'`.

In the UI, when the player is in `inn_common_room`, they would see exits like:

- `Leave the inn`
- `Go upstairs to your room`

And when a movement is chosen, the server updates `currentNodeId` and prompts the LLM to describe the new location, using the underlying `Room` or `Building` description.

## 9. Next Steps

If we move forward with this design, likely first steps are:

1. **Define schemas** for `LocationNode`, `LocationLink`, and `Map` in `packages/schemas/src/location/`.
2. **Create sample map data** under `data/maps/` referencing existing region/building/room IDs.
3. **Extend the API session state** to track `currentNodeId` and `availableExits`.
4. **Update the web client** to display exits as structured actions alongside the existing chat.

Once this baseline works, we can iterate on conditions, fog-of-war, and more advanced navigation semantics without breaking the core model.
