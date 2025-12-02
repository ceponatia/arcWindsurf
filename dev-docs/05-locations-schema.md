# Locations Schema

This document outlines the data structures used to represent concrete places within a Setting in Minimal RPG.

While the `SettingProfile` defines the "macro" world context, the `Location` schemas describe specific regions, buildings, and rooms inside that world. These schemas are defined in `@minimal-rpg/schemas` but are **not yet fully integrated** into the session runtime or database tables.

**Source:** `packages/schemas/src/location/`

## Region (`Region`)

A broad geographical area.

| Field               | Type | Options                                                                       |
| :------------------ | :--- | :---------------------------------------------------------------------------- |
| `climate`           | enum | `temperate`, `tropical`, `arid`, `polar`, `continental`, `alien`              |
| `terrain`           | enum | `plains`, `forest`, `mountains`, `desert`, `swamp`, `coast`, `urban`, `mixed` |
| `populationDensity` | enum | `sparse`, `scattered`, `settled`, `dense`, `mega_city`                        |

## Building (`Building`)

A specific structure within a region.

| Field       | Type | Options                                                                                             |
| :---------- | :--- | :-------------------------------------------------------------------------------------------------- |
| `type`      | enum | `residential`, `commercial`, `industrial`, `civic`, `religious`, `military`, `educational`, `other` |
| `condition` | enum | `pristine`, `well_kept`, `worn`, `ruined`                                                           |
| `size`      | enum | `tiny`, `small`, `medium`, `large`, `huge`                                                          |

## Room (`Room`)

A specific area within a building (or distinct area).

| Field      | Type | Options                                                                                   |
| :--------- | :--- | :---------------------------------------------------------------------------------------- |
| `purpose`  | enum | `living`, `sleeping`, `storage`, `work`, `ritual`, `throne`, `prison`, `utility`, `other` |
| `size`     | enum | `tiny`, `small`, `medium`, `large`, `vast`                                                |
| `lighting` | enum | `bright`, `dim`, `dark`, `flickering`                                                     |

## Data Persistence

**Current Status:** Location schemas exist in code, but there is **no persistence layer** (JSON files or DB tables) currently implemented for Regions, Buildings, or Rooms. They are not yet used in the session loop.

Future work will likely involve:

- Adding JSON loaders and/or DB tables for location data.
- Linking locations to a `SettingProfile` via IDs or containment.
- Tracking the player's current location and transitions between locations.

## TBD / Open Questions

- **Map & Navigation**: How are locations connected? (See `dev-docs/archive/location-maps.old.md` for concepts).
- **Hierarchy**: How do Regions, Buildings, and Rooms relate to a `SettingProfile`? (Likely via ID references or containment).
- **State Tracking**: How will the player's current location be tracked in the session?
- **Persistence**: What persistence model (DB tables vs. JSON) should be used for location data?
