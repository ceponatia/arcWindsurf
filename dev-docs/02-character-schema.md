# Character Schema Field Usage Reference

This document provides a complete example character JSON using all available fields, followed by a comprehensive breakdown of where and how each field is used throughout the application.

## Complete Example Character

```json
{
  "id": "elena-thornwood",
  "name": "Elena Thornwood",
  "age": 28,
  "gender": "female",
  "summary": "A pragmatic herbalist and village healer with a mysterious past, known for her dry wit and reluctance to discuss her noble origins.",
  "backstory": "Born into the declining Thornwood noble family, Elena fled an arranged marriage at seventeen. She apprenticed under a wandering healer for a decade, learning both medicine and how to defend herself. Now she runs a small apothecary in the village, preferring the simple life but haunted by those who might still search for her.",
  "tags": ["healer", "noble", "mystery", "romance"],
  "personality": [
    "pragmatic",
    "guarded",
    "compassionate beneath a tough exterior",
    "dry humor as a defense mechanism"
  ],
  "physique": {
    "build": {
      "height": "tall",
      "torso": "athletic",
      "skinTone": "olive",
      "arms": {
        "build": "toned",
        "length": "average"
      },
      "legs": {
        "length": "long",
        "build": "toned"
      },
      "feet": {
        "size": "average",
        "shape": "narrow"
      }
    },
    "appearance": {
      "hair": {
        "color": "dark auburn",
        "style": "usually braided",
        "length": "long"
      },
      "eyes": {
        "color": "grey-green"
      },
      "features": ["high cheekbones", "small scar above left eyebrow", "calloused hands"]
    }
  },
  "scent": {
    "hairScent": "rosemary and mint",
    "bodyScent": "dried herbs and clean sweat",
    "perfume": "lavender oil"
  },
  "body": {
    "hair": {
      "scent": {
        "primary": "rosemary shampoo",
        "notes": ["mint", "fresh herbs"],
        "intensity": 0.6
      },
      "visual": {
        "description": "Long, dark auburn hair typically worn in a practical braid",
        "features": ["a few grey strands at the temples"]
      },
      "texture": {
        "primary": "silky",
        "temperature": "neutral",
        "moisture": "normal"
      }
    },
    "hands": {
      "visual": {
        "description": "Strong, capable hands with short practical nails",
        "features": ["calloused palms", "herb stains on fingertips"],
        "skinCondition": "normal"
      },
      "scent": {
        "primary": "herbs and medicine",
        "notes": ["chamomile", "willow bark"],
        "intensity": 0.7
      },
      "texture": {
        "primary": "calloused",
        "temperature": "warm",
        "moisture": "dry"
      }
    },
    "neck": {
      "scent": {
        "primary": "lavender oil",
        "intensity": 0.5
      }
    },
    "torso": {
      "scent": {
        "primary": "clean with herbal undertones",
        "notes": ["dried herbs from her work"],
        "intensity": 0.4
      },
      "texture": {
        "primary": "smooth",
        "temperature": "warm",
        "moisture": "normal"
      }
    },
    "feet": {
      "visual": {
        "description": "Narrow feet with high arches",
        "skinCondition": "normal"
      },
      "texture": {
        "primary": "soft",
        "temperature": "cool",
        "moisture": "normal"
      }
    }
  },
  "personalityMap": {
    "dimensions": {
      "openness": 0.65,
      "conscientiousness": 0.8,
      "extraversion": 0.35,
      "agreeableness": 0.55,
      "neuroticism": 0.45
    },
    "facets": {
      "imagination": 0.6,
      "orderliness": 0.85,
      "cautiousness": 0.75,
      "self-efficacy": 0.8,
      "friendliness": 0.4,
      "gregariousness": 0.3,
      "trust": 0.35,
      "altruism": 0.7,
      "anxiety": 0.5,
      "vulnerability": 0.4
    },
    "traits": ["pragmatic", "guarded", "self-reliant", "observant", "dry humor"],
    "emotionalBaseline": {
      "current": "anticipation",
      "intensity": "mild",
      "moodBaseline": "trust",
      "moodStability": 0.7
    },
    "values": [
      { "value": "independence", "priority": 1 },
      { "value": "competence", "priority": 2 },
      { "value": "helpfulness", "priority": 3 },
      { "value": "safety", "priority": 4 }
    ],
    "fears": [
      {
        "category": "exposure",
        "specific": "Being recognized and forced back to her noble family",
        "intensity": 0.8,
        "triggers": [
          "nobles visiting the village",
          "mention of the Thornwood name",
          "formal events"
        ],
        "copingMechanism": "avoidance"
      },
      {
        "category": "loss",
        "specific": "Losing the independence she worked so hard to build",
        "intensity": 0.6,
        "triggers": ["authority figures making demands", "romantic commitment"],
        "copingMechanism": "confrontation"
      }
    ],
    "attachment": "dismissive-avoidant",
    "social": {
      "strangerDefault": "guarded",
      "warmthRate": "slow",
      "preferredRole": "advisor",
      "conflictStyle": "diplomatic",
      "criticismResponse": "reflective",
      "boundaries": "rigid"
    },
    "speech": {
      "vocabulary": "educated",
      "sentenceStructure": "moderate",
      "formality": "neutral",
      "humor": "occasional",
      "humorType": "dry",
      "expressiveness": "reserved",
      "directness": "direct",
      "pace": "measured"
    },
    "stress": {
      "primary": "flight",
      "secondary": "fight",
      "threshold": 0.6,
      "recoveryRate": "moderate",
      "soothingActivities": ["herb preparation", "long walks", "cataloguing medicines"],
      "stressIndicators": [
        "becomes overly formal",
        "finds excuses to be alone",
        "works obsessively"
      ]
    }
  },
  "details": [
    {
      "label": "Noble Signet Ring",
      "value": "Keeps a Thornwood signet ring hidden in a secret pocket, unable to part with this last connection to her family",
      "area": "history",
      "importance": 0.9,
      "tags": ["secret", "family", "noble"],
      "notes": "Could be discovered if someone searches her thoroughly"
    },
    {
      "label": "Healing Expertise",
      "value": "Exceptionally skilled at treating wounds and illness, known throughout the region for her effectiveness",
      "area": "ability",
      "importance": 0.8,
      "tags": ["healer", "reputation", "skill"]
    },
    {
      "label": "Combat Training",
      "value": "Secretly trained in knife fighting and self-defense during her years with the wandering healer",
      "area": "ability",
      "importance": 0.7,
      "tags": ["secret", "combat", "self-defense"],
      "notes": "Only uses when cornered, doesn't advertise this skill"
    },
    {
      "label": "Arranged Marriage",
      "value": "Fled from an arranged marriage to Lord Vance Coldbrook, who may still be searching for her",
      "area": "history",
      "importance": 0.85,
      "tags": ["secret", "threat", "backstory"],
      "notes": "The Coldbrook family is wealthy and vindictive"
    },
    {
      "label": "Morning Routine",
      "value": "Rises at dawn, tends her herb garden, then opens the apothecary precisely at eight",
      "area": "preference",
      "importance": 0.3,
      "tags": ["routine", "daily-life"]
    },
    {
      "label": "Weakness for Pastries",
      "value": "Despite her practical nature, has a secret weakness for the baker's honey cakes",
      "area": "preference",
      "importance": 0.2,
      "tags": ["quirk", "food", "secret"]
    }
  ]
}
```

---

## Field Usage Reference

### Legend

| Symbol | Meaning                          |
| ------ | -------------------------------- |
| ✅     | Actively used in production code |
| ⚠️     | Stored but limited/partial usage |
| ❌     | Stored but not currently used    |
| 🔀     | Affects agent routing/selection  |
| 💬     | Injected into LLM prompts        |
| 🖥️     | Displayed in UI                  |
| 💾     | Used for persistence/state       |

---

## CharacterBasics Fields

### `id`

- Status: ✅ 💾 🖥️
- Type: `string` (min 1 char)
- Purpose: Unique identifier for the character.

Usage locations:

- `packages/schemas/src/character/basics.ts` – Schema definition (`z.string().min(1)`).
- `packages/api/src/data/loader.ts` – Data loader; validates that `parsed.id` matches the expected ID.
- `packages/api/src/routes/characters.ts` – CRUD handlers; used for uniqueness checking and lookup.
- `packages/web/src/features/character-builder/CharacterBuilder.tsx` – Form; editable ID field.
- `packages/web/src/features/character-builder/components/PreviewSidebar.tsx` – Preview; displays the ID.

---

### `name`

- Status: ✅ 💬 🖥️ 💾
- Type: `string` (1-120 chars)
- Purpose: Character's display name.

Usage locations:

- `packages/schemas/src/character/basics.ts` – Schema definition (`z.string().min(1).max(120)`).
- `packages/api/src/llm/prompt.ts` – `buildNpcSystemPrompt`; "You are {name}, a...".
- `packages/agents/src/npc-agent.ts` – `buildSystemPrompt`; "{name} is a {age} year old...".
- `packages/agents/src/sensory/smell-agent.ts` – Multiple functions; target name for sensory descriptions.
- `packages/governor/src/context-builder.ts` – `DefaultContextBuilder.extractCharacterSlice`; extracts `name` into `CharacterSlice` for agents.
- `packages/governor/src/governor.ts` – `detectIntent`; uses character/NPC `name` in `presentNpcs` for intent detection context.
- `packages/web/src/features/character-builder/` – Form + Preview; UI display and editing.

---

### `age`

- Status: ✅ 💬 🖥️ 💾
- Type: `number` (positive int, optional)
- Purpose: Character's age in years.

Usage locations:

- `packages/schemas/src/character/basics.ts` – Schema definition (`z.number().int().positive().optional()`).
- `packages/agents/src/npc-agent.ts` – `buildSystemPrompt`; "{name} is a {age} year old..." (optional).
- `packages/governor/src/context-builder.ts` – `DefaultContextBuilder.extractCharacterSlice`; extracts `age` into `CharacterSlice`.
- `packages/web/src/features/character-builder/` – Form + Preview; UI display and editing.

---

### `gender`

- Status: ✅ 💬 🖥️ 💾
- Type: `string` (min 1 char, optional)
- Purpose: Character's gender identity.

Usage locations:

- `packages/schemas/src/character/basics.ts` – Schema definition (`z.string().min(1).optional()`).
- `packages/api/src/llm/prompt.ts` – `serializeCharacter`; "Gender: {gender}" (appears after age, before backstory in prompts).
- `packages/web/src/features/character-builder/components/BasicsSection.tsx` – Form; editable text input field.
- `packages/web/src/features/character-builder/CharacterBuilder.tsx` – `buildProfile`; includes gender in profile output when provided.
- `packages/web/src/features/character-builder/hooks/useCharacterBuilderForm.ts` – `mapProfileToForm`; extracts gender from loaded characters.

---

### `summary`

- Status: ✅ 🖥️
- Type: `string` (min 1 char)
- Purpose: Brief description for users to identify characters in their library.

Usage locations:

- `packages/schemas/src/character/basics.ts` – Schema definition (`z.string().min(1)`).
- `packages/api/src/routes/characters.ts` – API handlers; returned in list DTOs.
- `packages/web/src/features/character-builder/` – Preview; displayed in the preview card.

Note: This field is for **UI display only** (character library browsing). It should NOT be injected into LLM prompts.

---

### `backstory`

- Status: ✅ 💬 🖥️ 💾
- Type: `string` (min 1 char)
- Purpose: Detailed character history and background.

Usage locations:

- `packages/schemas/src/character/basics.ts` – Schema definition (`z.string().min(1)`).
- `packages/api/src/llm/prompt.ts` – `buildNpcSystemPrompt`; "## Backstory\n{backstory}".
- `packages/agents/src/npc-agent.ts` – `buildSystemPrompt`; "Backstory: {backstory}".
- `packages/governor/src/context-builder.ts` – `DefaultContextBuilder.extractCharacterSlice`; extracts `backstory` into `CharacterSlice`.
- `packages/web/src/features/character-builder/` – Form; editable textarea.

Note: This will need to be refactored into a more specific field (or fields) in the future to provide rich background.

---

### `tags`

- Status: ✅ 🖥️
- Type: `string[]` (default: `['draft']`)
- Purpose: Categorization for filtering and searching in UI.

Usage locations:

- `packages/schemas/src/character/basics.ts` – Schema definition (`z.array(z.string().min(1)).default(['draft'])`).
- `packages/api/src/routes/characters.ts` – API handlers; returned in summary DTOs for filtering.
- `packages/web/src/features/character-builder/` – Form; tag management UI.

Note: Character `tags` are for **UI filtering and searching only**. They are NOT injected into LLM prompts or used for agent routing. For genre-specific prompt rules, use the separate **Prompt Tag** system (`PromptTag` entities managed via the Tag Builder).

---

## Personality Fields

### `personality`

| Aspect                                                                                             | Details                                                         |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Status**                                                                                         | ⚠️ 💬 🖥️ 💾 (legacy summary; kept for backward compatibility)   |
| **Type**                                                                                           | `string \| string[]`                                            |
| **Purpose**                                                                                        | Human-written summary / quick-tag list; some prompts still read |
| it, but core NPC behavior now comes from `personalityMap` (Big Five sliders and structured traits) |                                                                 |

**Usage Locations:**

| File                                                                           | Function/Component          | Usage                                                                                           |
| ------------------------------------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/schemas/src/character/characterProfile.ts`                           | Schema definition           | Required field; `string \| string[]` for backward compatibility                                 |
| `packages/api/src/llm/prompt.ts`                                               | `serializeCharacter`        | 💬 Serializes to a single line (`Personality` / `Personality Traits`) in the core system prompt |
| `packages/agents/src/npc-agent.ts`                                             | `buildDialogueSystemPrompt` | 💬 Optional line: `Your personality traits: {personality}` (legacy flavor, not primary driver)  |
| `packages/agents/src/sensory/sensory-agent.ts`                                 | Smell/touch inference       | 💬 May include as loose context when inferring sensory descriptions                             |
| `packages/governor/src/context-builder.ts`                                     | Context builder             | 💾 Extracts `personality` into `CharacterSlice` for agents                                      |
| `packages/web/src/features/character-builder/PersonalitySection.tsx`           | Personality UI              | 🖥️ "Quick Traits" text box; stored as comma-separated list and mapped to `personality`          |
| `packages/web/src/features/character-builder/hooks/useCharacterBuilderForm.ts` | Form mapping                | 💾 Maps `CharacterProfile.personality` ⇄ comma-separated `form.personality`                     |

**Notes:**

- New behavior (NPC dialogue, temperament, and speech style) is driven by `personalityMap` rather than this free-text field.
- For new characters, treat `personality` as an author-facing summary or quick label; the Big Five sliders and structured personality map are the canonical source of behavioral prompts.

---

### `personalityMap`

| Aspect      | Details                                               |
| ----------- | ----------------------------------------------------- |
| **Status**  | ⚠️ 💬 🖥️ 💾 (partial usage)                           |
| **Type**    | `PersonalityMap` object                               |
| **Purpose** | Structured personality data for advanced NPC behavior |

**Sub-field Usage:**

| Sub-field                      | Status | Used In                                                                                                                                             |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dimensions` (Big Five scores) | ✅ 💬  | `packages/agents/src/personality-mapping.ts` → `buildDimensionTraitPhrases` → `NpcAgent.buildDialogueSystemPrompt` (slider-based temperament lines) |
| `facets` (granular scores)     | ❌     | Stored only, not currently read by agents or prompts                                                                                                |
| `traits`                       | ⚠️ 🖥️  | Edit-only list of trait prompt IDs in builder UI; validated via `validateTraitSet` but not yet injected into prompts                                |
| `emotionalBaseline`            | ❌     | Stored only, not in prompts                                                                                                                         |
| `values`                       | ✅ 💬  | `packages/agents/src/npc-agent.ts` – "Core values: …" line in dialogue system prompt                                                                |
| `fears`                        | ❌     | UI only, not in agent prompts                                                                                                                       |
| `attachment`                   | ❌     | Stored only, not in prompts                                                                                                                         |
| `social`                       | ❌     | UI only, not in agent prompts                                                                                                                       |
| `speech`                       | ✅ 💬  | `packages/agents/src/npc-agent.ts` – vocabulary, formality, directness in dialogue system prompt                                                    |
| `stress`                       | ❌     | UI only, not in agent prompts                                                                                                                       |

**Usage Locations:**

| File                                                                            | Function/Component           | Usage                                                                                        |
| ------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/schemas/src/character/personality.ts`                                 | Schema + helpers             | `PersonalityMapSchema`, Big Five constants, trait prompts, conflict rules                    |
| `packages/agents/src/personality-mapping.ts`                                    | `buildDimensionTraitPhrases` | 💬 Converts `dimensions` slider scores into short temperament lines for NPC system prompts   |
| `packages/agents/src/npc-agent.ts`                                              | `buildDialogueSystemPrompt`  | 💬 Injects speech style, core values, and Big Five–derived temperament bullet list           |
| `packages/governor/src/context-builder.ts`                                      | Context builder              | 💾 Extracts `personalityMap` into `CharacterSlice` for agents                                |
| `packages/web/src/features/character-builder/components/PersonalitySection.tsx` | Personality editor UI        | 🖥️ Big Five sliders, values/fears/attachment/social/speech/stress editors, trait ID text box |
| `packages/web/src/features/character-builder/hooks/useCharacterBuilderForm.ts`  | Form mapping                 | 💾 Maps `PersonalityMap` ⇄ `PersonalityFormState` (dimensions array, values, fears, etc.)    |

**Optimization Opportunities:**

The following `personalityMap` fields are defined in the schema and editable in UI but **not yet used in any agent prompts** (beyond the basic Big Five → temperament lines):

- `facets` - Granular personality facet scores
- `emotionalBaseline` - Current emotion, mood stability
- `fears` - Fear categories, triggers, coping mechanisms
- `attachment` - Attachment style
- `social` - Stranger default, warmth rate, conflict style, etc.
- `stress` - Stress response, threshold, recovery rate

In addition, the trait-prompt system in `packages/schemas/src/character/personality.ts` (via `TRAIT_PROMPTS`, `getTraitPrompt`, and `CATEGORY_LIMITS`) is wired for future use: builders can specify trait IDs in `personalityMap.traits`, and helpers can resolve them to prompt fragments, but no runtime agent currently injects those trait prompts.

---

## Physical Description Fields

### `physique`

| Aspect      | Details                                           |
| ----------- | ------------------------------------------------- |
| **Status**  | ✅ 💬 🖥️ 💾                                       |
| **Type**    | `string \| Physique` (build + appearance objects) |
| **Purpose** | Physical appearance description                   |

**Usage Locations:**

| File                                                    | Function/Component     | Usage                                              |
| ------------------------------------------------------- | ---------------------- | -------------------------------------------------- |
| `packages/schemas/src/character/appearance.ts`          | Schema definition      | `PhysiqueSchema` (build + appearance)              |
| `packages/api/src/llm/prompt.ts`                        | `buildNpcSystemPrompt` | 💬 Calls `formatPhysique()`                        |
| `packages/api/src/llm/prompt.ts`                        | `formatPhysique`       | 💬 Formats hair, eyes, build, arms, legs, features |
| `packages/agents/src/sensory/smell-agent.ts`            | Sensory prompts        | 💬 NPC physique for context                        |
| `packages/governor/src/context-builder.ts`              | Context builder        | 💾 Extracts `physique` into `CharacterSlice`       |
| `packages/web/src/features/character-builder/sections/` | PhysiqueSection        | 🖥️ Full UI for build/appearance                    |

**Physique Sub-fields Used in Prompts:**

| Path                    | Used | Notes                              |
| ----------------------- | ---- | ---------------------------------- |
| `build.height`          | ✅   | "Height: {height}"                 |
| `build.torso`           | ✅   | "Build: {torso}"                   |
| `build.skinTone`        | ✅   | "Skin: {skinTone}"                 |
| `build.arms.build`      | ✅   | "Arms: {build}"                    |
| `build.arms.length`     | ✅   | "Arms: {build}, {length}"          |
| `build.legs.build`      | ✅   | "Legs: {build}"                    |
| `build.legs.length`     | ✅   | "Legs: {build}, {length}"          |
| `build.feet.size`       | ✅   | "Feet: {size}"                     |
| `build.feet.shape`      | ✅   | "Feet: {size}, {shape}"            |
| `appearance.hair.*`     | ✅   | "Hair: {color}, {style}, {length}" |
| `appearance.eyes.color` | ✅   | "Eyes: {color}"                    |
| `appearance.features`   | ✅   | Listed as notable features         |

---

### `scent` (Legacy)

| Aspect      | Details                                          |
| ----------- | ------------------------------------------------ |
| **Status**  | ⚠️ 💬 💾 (deprecated)                            |
| **Type**    | `Scent` object (hairScent, bodyScent, perfume)   |
| **Purpose** | Legacy flat scent data, superseded by `body` map |

**Usage Locations:**

| File                                         | Function/Component     | Usage                                                              |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `packages/schemas/src/character/scent.ts`    | Schema definition      | `ScentSchema` (hairScent, bodyScent, perfume)                      |
| `packages/api/src/llm/prompt.ts`             | `buildNpcSystemPrompt` | 💬 Calls `formatScent()`                                           |
| `packages/api/src/llm/prompt.ts`             | `formatScent`          | 💬 "Hair: {hairScent}, Body: {bodyScent}..."                       |
| `packages/agents/src/sensory/smell-agent.ts` | Sensory prompts        | 💬 Fallback when body map not available                            |
| `packages/governor/src/context-builder.ts`   | Context builder        | 💾 Extracts legacy `scent` into `CharacterSlice` for compatibility |

**Note:** This field is marked `@deprecated`. Use `body` map for new characters.

---

### `body`

| Aspect      | Details                                            |
| ----------- | -------------------------------------------------- |
| **Status**  | ✅ 💬 🔀 🖥️ 💾                                     |
| **Type**    | `BodyMap` (per-region scent/texture/visual/flavor) |
| **Purpose** | Detailed sensory data by body region               |

**Usage Locations:**

| File                                                    | Function/Component      | Usage                                                |
| ------------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| `packages/schemas/src/character/body.ts`                | Schema definition       | `BodyMapSchema` (per-region sensory)                 |
| `packages/utils/src/bodyParser/parsers.ts`              | `parseBodyEntries`      | 💬 Parses natural language into `BodyMap` structure  |
| `packages/utils/src/bodyParser/formatters.ts`           | Format functions        | 💬 Converts `BodyMap` back to human-readable text    |
| `packages/utils/src/bodyParser/keywords.ts`             | Keyword detection       | 💬 Suffix-aware sensory keyword matching             |
| `packages/agents/src/sensory/smell-agent.ts`            | `formatScentData`       | 💬 Extracts scent per region                         |
| `packages/agents/src/sensory/smell-agent.ts`            | `getRegionScent`        | 💬 Gets scent for specific body region               |
| `packages/agents/src/sensory/smell-agent.ts`            | `getRegionTexture`      | 💬 Gets texture for specific body region             |
| `packages/governor/src/equipment-resolver.ts`           | Equipment lookup        | 🔀 Maps body regions to equipment slots              |
| `packages/governor/src/context-builder.ts`              | Context builder         | 💾 Extracts `body` map into `CharacterSlice`         |
| `packages/web/src/features/character-builder/sections/` | BodySection             | 🖥️ Full UI for body sensory data                     |
| `packages/web/src/features/character-builder/`          | CharacterBuilder.tsx    | 💾 Uses `parseBodyEntries` from `@minimal-rpg/utils` |
| `packages/web/src/features/character-builder/hooks/`    | useCharacterBuilderForm | 💾 Uses format functions from `@minimal-rpg/utils`   |

**Sensory Types:**

Each body region can have up to four types of sensory data:

- **scent**: How the region smells (primary, notes, intensity)
- **texture**: How the region feels to touch (primary, temperature, moisture, notes)
- **visual**: How the region looks (description, features, skinCondition)
- **flavor**: How the region tastes (primary, notes, intensity)

**Available Body Regions:**

Standard regions available for all characters:

- head, face, ears, mouth, hair, neck, throat, shoulders, chest, back, lowerBack, torso, abdomen, navel, armpits, arms, hands, waist, hips, groin, buttocks, anus, legs, thighs, knees, calves, ankles, feet, toes

Gender-specific regions (conditional):

- **breasts** - Available for female characters
- **nipples** - Available for female characters
- **penis** - Available for male characters
- **vagina** - Available for female characters

The character builder UI conditionally shows gender-specific regions based on the `gender` field in `CharacterBasics`:

- Female (contains "female" or "woman"): shows breasts, nipples, vagina
- Male (contains "male" or "man"): shows penis
- Non-binary/other/unspecified: shows all regions

**Parsing and Formatting:**

The bodyParser utilities (moved from `@minimal-rpg/schemas` to `@minimal-rpg/utils` in v0.0.0) enable natural language input:

1. Character builder receives: "hair: scent: strong musk, floral" or "neck: flavor: subtle salty, hint of sweet"
2. `parseBodyEntries()` detects sensory type using `containsSensoryKeyword()` with suffix-aware regex matching
3. Extracts intensity ("strong" → 0.8), primary ("musk"), and notes (["floral"])
4. Creates structured `BodyMap` entry: `{ hair: { scent: { primary: "musk", notes: ["floral"], intensity: 0.8 } } }`
5. When editing, `formatScent()` or `formatFlavor()` converts back to "strong musk, floral"

**Agent Routing Logic:**

The Sensory Agent uses `body` data for smell, touch, and taste intents:

1. Player says: "I smell her hair" or "I taste his neck"
2. Intent detection extracts: `{ action: 'smell', target: 'hair' }` or `{ action: 'taste', target: 'neck' }`
3. `resolveBodyRegion('hair')` returns `'hair'` region
4. `getRegionScent(character.body, 'hair')` or `getRegionFlavor(character.body, 'neck')` returns sensory data
5. Sensory data is formatted and returned to player

**Keyword Detection:**

The `containsSensoryKeyword()` function in `packages/utils/src/bodyParser/keywords.ts` uses intelligent suffix matching:

- **Scent keywords**: "smell", "sniff", "aroma", "fragrance", "scent", etc.
- **Texture keywords**: "feel", "touch", "texture", "surface", "stroke", etc.
- **Visual keywords**: "look", "see", "appearance", "examine", "inspect", etc.
- **Flavor keywords**: "taste", "lick", "flavor", "sample", "sip", etc.
- Matches base keywords + conjugations: "smell" → "smell", "smells", "smelling", "smelled"
- Uses word boundary regex (`\b{keyword}(s|es|ed|ing|er|est)?\b`) to prevent false positives
- Reduces keyword array size by ~60% compared to listing every conjugation

**Body Region to Equipment Mapping:**

```typescript
const REGION_TO_SLOTS: Record<BodyRegion, EquipmentSlot[]> = {
  head: ['head'],
  face: ['face'],
  neck: ['neck'],
  torso: ['torso', 'outerwear'],
  // ...
};
```

**Related Documentation:**

- [packages/utils/src/bodyParser/README.md](../packages/utils/src/bodyParser/README.md) - Comprehensive bodyParser documentation
- [packages/schemas/src/character/README.md](../packages/schemas/src/character/README.md) - Character schema overview

---

## Details Field

### `details`

| Aspect      | Details                                           |
| ----------- | ------------------------------------------------- |
| **Status**  | ⚠️ 💬 🖥️ 💾 (partial usage)                       |
| **Type**    | `CharacterDetail[]` (max 32)                      |
| **Purpose** | Flexible fact storage for knowledge nodes and RAG |

**Detail Object Structure:**

```typescript
{
  label: string;      // Short identifier
  value: string;      // Detailed content
  area: AreaType;     // Category (appearance, history, ability, etc.)
  importance: number; // 0-1 priority for prompt inclusion
  tags: string[];     // Additional categorization
  notes?: string;     // Author notes (not shown to players)
}
```

**Usage Locations:**

| File                                                      | Function/Component     | Usage                                                          |
| --------------------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| `packages/schemas/src/character/details.ts`               | Schema definition      | `CharacterDetailSchema` (label, value, area, importance, tags) |
| `packages/api/src/llm/prompt.ts`                          | `buildNpcSystemPrompt` | 💬 Calls `formatDetails()`                                     |
| `packages/api/src/llm/prompt.ts`                          | `formatDetails`        | 💬 Sorts by importance, formats as "{area}: {label} - {value}" |
| `packages/governor/src/context-builder.ts`                | Context builder        | 💾 Extracts `details` into `CharacterSlice`                    |
| `packages/retrieval/src/nodes/`                           | Node extraction        | 💾 Designed for RAG (not fully implemented)                    |
| `packages/web/src/features/character-builder/sections/`   | DetailsSection         | 🖥️ UI for editing details                                      |
| `packages/web/src/features/character-builder/components/` | PreviewSidebar         | 🖥️ Shows first 3 details                                       |

**Sub-field Usage:**

| Sub-field    | Status | Usage                                          |
| ------------ | ------ | ---------------------------------------------- |
| `label`      | ✅ 💬  | Displayed in prompt as identifier              |
| `value`      | ✅ 💬  | Main content in prompt                         |
| `area`       | ✅ 💬  | Used as category prefix in prompt              |
| `importance` | ✅ 💬  | **Sorting**: Higher importance = appears first |
| `tags`       | ❌     | Stored but not used in prompts                 |
| `notes`      | ❌     | Stored but not used in prompts (author-only)   |

---

## Agent Routing Summary

### Fields That Affect Agent Behavior

| Field                   | Routing Effect                                                          |
| ----------------------- | ----------------------------------------------------------------------- |
| `body`                  | 🔀 Determines if sensory data exists for queries about specific regions |
| `personalityMap.speech` | 💬 Styles dialogue generation (vocabulary, formality, etc.)             |

### Fields Injected Into Prompts

| Field                   | Prompt Location                            |
| ----------------------- | ------------------------------------------ |
| `name`                  | System prompt header, dialogue attribution |
| `age`                   | Optional in NPC system prompt              |
| `backstory`             | Main NPC system prompt section             |
| `personality`           | Personality section in prompts             |
| `physique`              | Physical description section               |
| `scent`                 | Scent section (legacy fallback)            |
| `body`                  | Sensory queries for specific regions       |
| `personalityMap.traits` | (planned) trait catalog for future prompts |
| `personalityMap.values` | Core values in prompts                     |
| `personalityMap.speech` | Speech style modifiers                     |
| `details`               | Sorted list of character facts             |

### Fields Not Currently Used

| Field                              | Status | Notes                                   |
| ---------------------------------- | ------ | --------------------------------------- |
| `personalityMap.dimensions`        | ⚠️     | Big Five scores → NPC temperament lines |
| `personalityMap.facets`            | ❌     | Granular scores stored but not used     |
| `personalityMap.emotionalBaseline` | ❌     | Emotion state stored but not used       |
| `personalityMap.fears`             | ❌     | Fear data stored but not used           |
| `personalityMap.attachment`        | ❌     | Attachment style stored but not used    |
| `personalityMap.social`            | ❌     | Social patterns stored but not used     |
| `personalityMap.stress`            | ❌     | Stress behavior stored but not used     |
| `details[].tags`                   | ❌     | Detail tags stored but not used         |
| `details[].notes`                  | ❌     | Author notes stored but not used        |

---

## Optimization Recommendations

### High-Priority Opportunities

1. **Use `personalityMap.fears`** - Could trigger specific NPC reactions when fear triggers are mentioned in player input

2. **Use `personalityMap.stress`** - Could affect NPC behavior when session state indicates high tension

3. **Use `personalityMap.social`** - Could affect initial NPC stance based on player relationship status

4. **Use `personalityMap.dimensions`** - Could be used for personality-based response variation

### Medium-Priority Opportunities

1. **Use `details[].tags`** - Could enable RAG filtering by tag (e.g., only retrieve "combat" details during fight)

2. **Use `personalityMap.emotionalBaseline`** - Could set initial emotional state in NPC prompts

### Low-Priority Opportunities

1. **Use `details[].notes`** - Keep as author-only, but could be shown in admin/debug views

2. **Use `personalityMap.facets`** - More granular than dimensions, useful for fine-tuned behavior
