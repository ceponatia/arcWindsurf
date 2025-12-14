# Locations Schema

This document outlines the data structures used to represent concrete places within a Setting in Minimal RPG.

While the `SettingProfile` defines the "macro" world context, the `Location` schemas describe specific regions, buildings, and rooms inside that world.

**Source:** `packages/schemas/src/location/` (static definitions) and `packages/schemas/src/state/` (runtime state)

## Static Location Types

### Region (`Region`)

A broad geographical area.

| Field               | Type | Options                                                                       |
| :------------------ | :--- | :---------------------------------------------------------------------------- |
| `climate`           | enum | `temperate`, `tropical`, `arid`, `polar`, `continental`, `alien`              |
| `terrain`           | enum | `plains`, `forest`, `mountains`, `desert`, `swamp`, `coast`, `urban`, `mixed` |
| `populationDensity` | enum | `sparse`, `scattered`, `settled`, `dense`, `mega_city`                        |

### Building (`Building`)

A specific structure within a region.

| Field       | Type | Options                                                                                             |
| :---------- | :--- | :-------------------------------------------------------------------------------------------------- |
| `type`      | enum | `residential`, `commercial`, `industrial`, `civic`, `religious`, `military`, `educational`, `other` |
| `condition` | enum | `pristine`, `well_kept`, `worn`, `ruined`                                                           |
| `size`      | enum | `tiny`, `small`, `medium`, `large`, `huge`                                                          |

### Room (`Room`)

A specific area within a building (or distinct area).

| Field      | Type | Options                                                                                   |
| :--------- | :--- | :---------------------------------------------------------------------------------------- |
| `purpose`  | enum | `living`, `sleeping`, `storage`, `work`, `ritual`, `throne`, `prison`, `utility`, `other` |
| `size`     | enum | `tiny`, `small`, `medium`, `large`, `vast`                                                |
| `lighting` | enum | `bright`, `dim`, `dark`, `flickering`                                                     |

### BuiltLocation (`BuiltLocation`)

Composite location with navigation metadata.

| Field         | Type            | Description                           |
| :------------ | :-------------- | :------------------------------------ |
| `id`          | string          | Unique location identifier            |
| `instanceId`  | string?         | Optional session-specific instance ID |
| `name`        | string          | Display name                          |
| `summary`     | string?         | Short description (max 320 chars)     |
| `description` | string          | Full description                      |
| `region`      | Region?         | Region metadata                       |
| `building`    | Building?       | Building metadata                     |
| `room`        | Room?           | Room metadata                         |
| `exits`       | LocationExit[]? | Navigation links to other locations   |
| `tags`        | string[]?       | Flavor tags                           |

## NPC Location State (Runtime)

**Source:** `packages/schemas/src/state/npc-location.ts`

These schemas track where NPCs are and what they're doing at runtime.

### NpcActivity

What an NPC is currently doing.

| Field         | Type    | Description                                       |
| :------------ | :------ | :------------------------------------------------ |
| `type`        | string  | Activity identifier (e.g., `working`, `sleeping`) |
| `description` | string  | Human-readable description                        |
| `engagement`  | enum    | `idle`, `casual`, `focused`, `absorbed`           |
| `target`      | string? | What they're interacting with                     |

### NpcLocationState

Complete state of where an NPC is.

| Field            | Type        | Description                         |
| :--------------- | :---------- | :---------------------------------- |
| `locationId`     | string      | Primary location ID                 |
| `subLocationId`  | string?     | Optional sub-location               |
| `activity`       | NpcActivity | Current activity                    |
| `arrivedAt`      | GameTime    | When they arrived                   |
| `interruptible`  | boolean     | Can they be interrupted?            |
| `scheduleSlotId` | string?     | Schedule slot that placed them here |

### NpcSimulationState

Cached simulation state for lazy simulation.

| Field            | Type                           | Description                  |
| :--------------- | :----------------------------- | :--------------------------- |
| `npcId`          | string                         | NPC identifier               |
| `lastComputedAt` | GameTime                       | When state was last computed |
| `currentState`   | NpcLocationState               | Current location state       |
| `dayDecisions`   | Record<string, ScheduleOption> | Cached schedule decisions    |

## Location Occupancy

**Source:** `packages/schemas/src/state/occupancy.ts`

Tracks who is at a location for encounter narration.

### CrowdLevel

Classification of how crowded a location is: `empty`, `sparse`, `moderate`, `crowded`, `packed`.

### LocationOccupancy

| Field              | Type              | Description                |
| :----------------- | :---------------- | :------------------------- |
| `locationId`       | string            | Location this describes    |
| `present`          | PresentNpc[]      | NPCs currently here        |
| `recentlyLeft`     | RecentDeparture[] | NPCs who just left         |
| `expectedArrivals` | ExpectedArrival[] | NPCs arriving soon         |
| `crowdLevel`       | CrowdLevel        | Crowd classification       |
| `capacity`         | number?           | Optional location capacity |
| `computedAt`       | GameTime          | When computed              |

## NPC Awareness and Availability

**Source:** `packages/schemas/src/state/awareness.ts` and `packages/schemas/src/state/availability.ts`

### NpcAwareness

How an NPC perceives the player upon entering their location.

| Field            | Type   | Description                                          |
| :--------------- | :----- | :--------------------------------------------------- |
| `npcId`          | string | NPC identifier                                       |
| `awarenessLevel` | enum   | `unaware`, `peripheral`, `noticed`, `focused`        |
| `reaction`       | enum?  | `neutral`, `pleased`, `wary`, `surprised`, `hostile` |
| `initiative`     | enum   | `approach`, `acknowledge`, `ignore`, `avoid`         |

### NpcAvailability

Whether an NPC can be interacted with.

| Field                  | Type    | Description                                     |
| :--------------------- | :------ | :---------------------------------------------- |
| `available`            | boolean | Can interact?                                   |
| `reason`               | enum?   | `sleeping`, `traveling`, `busy`, `inaccessible` |
| `canOverride`          | boolean | Can player override?                            |
| `overrideConsequences` | string? | What happens if overridden                      |

## Database Persistence

**Tables (migration 012_npc_location_state.sql):**

- `session_npc_location_state` - Per-NPC location and activity state
- `session_npc_simulation_cache` - Cached simulation state for lazy simulation
- `session_location_occupancy_cache` - Optional occupancy cache per location

**TypeScript types:** See `packages/db/src/types.ts` for `NpcLocationStateRow`, `NpcSimulationCacheRow`, `LocationOccupancyCacheRow`.

## Related Documents

- [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md) - Schedule system
- [31-npc-simulation-and-performance.md](31-npc-simulation-and-performance.md) - Simulation strategies
- [32-npc-encounters-and-occupancy.md](32-npc-encounters-and-occupancy.md) - Encounter generation
- [26-time-system.md](26-time-system.md) - GameTime schema

## TBD / Open Questions

- **Map & Navigation**: How are locations connected? (See `dev-docs/archive/location-maps.old.md` for concepts).
- **Static Data Loading**: JSON loaders for location definitions need to be implemented.
- **Governor Integration**: Wire occupancy context into turn flow for LLM prompts.
