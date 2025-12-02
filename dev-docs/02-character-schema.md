# Character Schema

This document outlines the data structures used to represent characters within the Minimal RPG system. Currently, the system uses a unified schema for all non-player characters (NPCs).

## Character Profile Schema

The core data structure is the `CharacterProfile`, defined in `@minimal-rpg/schemas`. It is a composite schema built from several modular components.

**Source:** `packages/schemas/src/character/index.ts`

### 1. Basics (`CharacterBasics`)

The fundamental identity of a character.

| Field       | Type     | Required | Description                                                 |
| :---------- | :------- | :------- | :---------------------------------------------------------- |
| `id`        | string   | Yes      | Unique identifier (slug or UUID).                           |
| `name`      | string   | Yes      | Display name (max 120 chars).                               |
| `age`       | number   | No       | Defaults to 21. Max 120.                                    |
| `summary`   | string   | Yes      | Short description for lists/previews.                       |
| `backstory` | string   | Yes      | Full background history.                                    |
| `tags`      | string[] | No       | Defaults to `['draft']`. Used for filtering/categorization. |

### 2. Appearance (`Appearance`)

Physical description of the character. Can be a simple string or a structured object.

**Source:** `packages/schemas/src/character/appearance.ts`

If structured, it includes:

| Field      | Type     | Default   | Options/Notes                                                     |
| :--------- | :------- | :-------- | :---------------------------------------------------------------- |
| `hair`     | object   | -         | `color` (brown), `style` (straight), `length` (medium)            |
| `eyes`     | object   | -         | `color` (brown)                                                   |
| `height`   | enum     | 'average' | `short`, `average`, `tall`                                        |
| `torso`    | enum     | 'average' | `slight`, `average`, `athletic`, `heavy`                          |
| `skinTone` | string   | 'pale'    | Free text                                                         |
| `features` | string[] | -         | Distinguishing features                                           |
| `arms`     | object   | -         | `build` (average/muscular/slender), `length` (average/long/short) |
| `legs`     | object   | -         | `length` (average/long/short), `build` (very skinny...muscular)   |

### 3. Personality (`CharacterPersonality`)

Defines how the character behaves and speaks.

**Source:** `packages/schemas/src/character/personality.ts`

- **`traits`**: `string | string[]` (Required). Key personality traits.
- **`speechStyle`** (Optional): Structured definition of speech patterns.
  - `sentenceLength`: `terse`, `balanced`, `long`
  - `humor`: `none`, `light`, `wry`, `dark`
  - `darkness`: `low`, `medium`, `high`
  - `pacing`: `slow`, `balanced`, `fast`
  - `formality`: `casual`, `neutral`, `formal`
  - `verbosity`: `terse`, `balanced`, `lavish`

### 4. Other Attributes

- **`scent`** (`Scent`): Optional.
  - `hairScent`, `bodyScent`, `perfume`.
- **`speakingStyle`** (string): Required. A high-level description of how they talk (e.g., "Gruff and direct").
- **`style`**: Optional alias/override for `speechStyle`.

## Data Persistence

Characters exist in three forms:

1. **Static Templates**: JSON files in `data/characters/`. Validated at server startup.
2. **Dynamic Templates**: Rows in the `character_profiles` table. Created via API.
3. **Session Instances**: Rows in the `character_instances` table.
   - Created when a session starts.
   - Contains a snapshot of the template (`template_snapshot`) and the current mutable state (`profile_json`).
   - Overrides are applied to `profile_json`.

## TBD / Open Questions

- **Inventory System**: How will items be defined and associated with characters?
- **Relationships**: How will relationships between different characters be tracked? (Currently implicit in chat history or potentially in `profile_json` if extended).
