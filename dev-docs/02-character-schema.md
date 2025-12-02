# Character Schema

This document outlines the data structures used to represent characters within the Minimal RPG system. Currently, the system uses a unified schema for all non-player characters (NPCs).

In addition to the core schema, this document also describes a planned **parsed attribute** layer that turns free-text inputs (for example, appearance paragraphs) into structured key-value attributes using regex and LLM-based parsers. Parsed attributes are designed to be best-effort and tolerant of missing detail.

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

#### 2.1 Free-text input and parsed attributes (planned)

In the future character-creation UX, authors may provide **free-text appearance descriptions** instead of (or in addition to) fully specifying the structured `Appearance` object.

Examples:

- "Tall, wiry build, messy dark hair, bright green eyes."
- "Short, stocky, with close-cropped grey hair and deep laugh lines."

To support this, the character schema design assumes two conceptual layers:

- `appearanceText?: string` – raw free-text as entered by the user (authoring convenience).
- `appearance: Appearance` – structured, parsed attributes derived from that text.

Key rules for parsed appearance attributes:

- `appearance` is intended to be **present in persisted profiles at all times** as an object, but its nested properties are optional.
- Missing subfields (for example, no `hair` at all, or `hair` without `color`) **must not** cause validation errors or block character creation.
- When parsers cannot confidently extract a value, the corresponding key is simply omitted; the system never fabricates required values just to satisfy the schema.

At a type level, this looks like:

- `appearance: { hair?: { color?: string; style?: string; length?: string }; eyes?: { color?: string }; height?: 'short' | 'average' | 'tall' | string; torso?: string; arms?: string; legs?: string; skinTone?: string; features?: string[]; /* ... */ }`

The parser pipeline (regex + LLM) is described at a higher level in the architecture and agent docs; this section only specifies that the **schema must tolerate partial data** while still encouraging normalized, structured attributes wherever possible.

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

### 5. Parsed Attributes Overview (planned)

The appearance example in Section 2.1 is the first concrete case of **parsed attributes**, but the same pattern is expected to apply to other semi-structured fields over time, for example:

- Free-text personality blurbs → normalized `traits: string[]` and possibly other `personalityAttributes`.
- Free-text body/health descriptions → normalized `physicalAttributes` (build, fitness, scars, etc.).

Common principles for all parsed-attribute fields:

- User-facing payloads may include both raw free-text fields (for example, `appearanceText`) and structured fields (for example, `appearance`).
- Persistence prefers the structured form (`appearance`, `personality`, etc.) but may also retain raw text for provenance or re-parsing.
- Parsers are **best-effort** and should not block character creation; failures or partial parses only affect how much structured data ends up in `profile_json`.

How and when parsing is invoked (synchronously on write vs. asynchronously in a background job) is a runtime concern and is covered in other dev docs; the schema here is explicitly designed to accept partially-filled parsed structures.

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
