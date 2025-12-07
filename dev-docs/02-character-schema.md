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
| `age`       | number   | No       | Character's age in years (positive integer).                |
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

#### 2.1 Free-text appearance notes → structured appearance

Authors can either fill `appearance` manually or provide **free-text appearance notes** in the UI (for example, `appearanceNotes`). On submit, the backend runs an extraction step that converts those notes into a **partial `Appearance` object** and merges it into `profile_json` (a `JSONB` column that stores the full `CharacterProfile`).

Examples of free text:

- "He has messy brown hair and bright green eyes, very tall and skinny."

Example of the corresponding partial structured appearance written into `profile_json.appearance`:

```jsonc
{
  "appearance": {
    "hair": { "color": "brown", "style": "messy" },
    "eyes": { "color": "green" },
    "height": "tall",
    "torso": "slight",
  },
  "meta": {
    "appearanceNotesRaw": "He has messy brown hair and bright green eyes, very tall and skinny.",
  },
}
```

Key rules for extracted appearance attributes:

- The extractor only fills fields it can infer with high confidence; everything else is omitted.
- Nested properties (for example, `appearance.hair.color`) are optional and may be missing when parsing does not produce values.
- The raw notes can be stored under `meta.appearanceNotesRaw` inside `profile_json` for provenance and possible re-parsing.

Implementation-wise, the extractor can combine:

- A heuristic/regex layer for obvious patterns (for example, "brown hair" → `appearance.hair.color = "brown"`).
- An LLM-based extractor that returns a **partial `CharacterProfile`** (all fields optional) that is deep-merged into the existing `profile_json` for that character.

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

#### 3.1 Free-text personality notes → structured personality

As with appearance, authors may provide **free-text personality notes** in the UI (for example, `personalityNotes`) instead of hand-authoring every field. On submit, the backend extracts a **partial personality structure** and merges it into `profile_json.personality`.

Example free-text input:

- "She's shy but sarcastic and speaks very formally."

Example of the corresponding partial structured personality merged into `profile_json`:

```jsonc
{
  "personality": {
    "traits": ["shy", "sarcastic"],
    "speechStyle": {
      "formality": "formal",
      "verbosity": "balanced",
    },
  },
  "meta": {
    "personalityNotesRaw": "She's shy but sarcastic and speaks very formally.",
  },
}
```

As with appearance:

- The extractor only sets `traits` and `speechStyle` fields it can infer confidently.
- Arrays such as `traits` in the extracted partial **replace** existing arrays when merged into `profile_json`.
- Raw notes are optionally stored under `meta.personalityNotesRaw` for debugging, auditing, or future re-extraction.

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
