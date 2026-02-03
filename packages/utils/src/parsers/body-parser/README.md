# Body Parser

Natural language parser for character body sensory descriptions. Converts human-readable text into structured `BodyMap` data and vice versa.

## Overview

The body parser enables character creators and developers to work with sensory descriptions (scent, texture, visual, flavor) using intuitive text input instead of complex nested objects. It handles intensity modifiers, temperature/moisture attributes, and supports multiple parsing formats.

## Core Functionality

### Parsing

Convert text descriptions into structured `BodyMap` objects:

- **Multi-format support**: Accepts "region: type: description", "region type: description", or "region - type - description"
- **Sensory type detection**: Automatically identifies scent/texture/visual/flavor from keywords (e.g., "smell", "feel", "look", "taste")
- **Intensity extraction**: Recognizes keywords like "strong", "faint", "subtle" and converts to numeric values (0.0-1.0)
- **Attribute parsing**: Extracts temperature (cold/cool/neutral/warm/hot) and moisture (dry/normal/damp/wet) from texture descriptions
- **Multi-line/semicolon support**: Parse multiple entries in one call

### Formatting

Convert structured `BodyMap` objects back to human-readable text:

- **Human-friendly output**: Generates "region: type: primary, notes..." format
- **Intensity prefixes**: Adds "strong"/"light" modifiers based on numeric intensity
- **Attribute inclusion**: Surfaces temperature and moisture in texture descriptions
- **Full map serialization**: Export complete `BodyMap` as multi-line text

### Keyword Matching

Intelligent keyword detection with suffix awareness:

- **Base forms only**: Keywords stored as root words (e.g., "smell", "touch", "look")
- **Automatic conjugation**: Matches "smell", "smells", "smelling", "smelled" from single "smell" keyword
- **Word boundary enforcement**: Uses regex `\b` patterns to prevent false positives (e.g., "goodsmell" won't match)
- **Suffix handling**: Supports common verb endings (s, es, ed, ing, er, est) without space separation

## Module Structure

### keywords.ts

Keyword dictionaries and intelligent matching functions.

**Exports:**

- `INTENSITY_KEYWORDS`: Map of words to numeric intensity (0.0-1.0)
- `TEMPERATURE_KEYWORDS`: Map of words to temperature enum values
- `MOISTURE_KEYWORDS`: Map of words to moisture enum values
- `SCENT_INDICATORS`: Keywords indicating smell/scent actions
- `TEXTURE_INDICATORS`: Keywords indicating touch/feel actions
- `VISUAL_INDICATORS`: Keywords indicating look/see actions
- `FLAVOR_INDICATORS`: Keywords indicating taste actions
- `SOUND_INDICATORS`: Keywords indicating hear/listen actions (not used in BodyMap parsing)
- `SENSORY_INDICATORS`: Object grouping all indicator arrays by type
- `containsSensoryKeyword(text, keywords)`: Suffix-aware keyword matcher using regex word boundaries
- `detectSensoryType(text)`: Identify sensory type (scent/texture/visual/flavor/sound) from text
- `getIntensityWord(intensity)`: Convert numeric intensity to descriptive word
- `getIntensityKeywordsInRange(min, max)`: Get keywords within intensity range
- `extractIntensity(phrase)`: Parse intensity from text, return value + cleaned phrase
- `extractTemperature(phrase)`: Parse temperature from text, return value + cleaned phrase
- `extractMoisture(phrase)`: Parse moisture from text, return value + cleaned phrase

**Types:**

- `SensoryType` (from `@minimal-rpg/schemas`): Union of sensory indicator keys (scent/texture/visual/flavor/sound)

### parsers.ts

Convert natural language input into structured sensory data.

**Exports:**

- `parseScent(description)`: Parse scent text into `RegionScent` (primary, notes, intensity)
- `parseTexture(description)`: Parse texture text into `RegionTexture` (primary, notes, temperature, moisture)
- `parseVisual(description)`: Parse visual text into `RegionVisual` (description, features)
- `parseFlavor(description)`: Parse flavor text into `RegionFlavor` (primary, notes, intensity)
- `parseBodyEntry(input)`: Parse single "region: type: description" line into `ParsedBodyEntry`
- `parseBodyEntries(input)`: Parse multiple entries (newline or semicolon separated) into `BodyParseResult`

**Types:**

- `BodyEntryInput`: Raw text input for a single entry
- `ParsedBodyEntry`: Parsed entry with region + optional sensory data fields
- `BodyParseResult`: Result object with parsed `BodyMap` and warning strings

### formatters.ts

Convert structured data back to human-readable text.

**Exports:**

- `formatScent(scent)`: Convert `RegionScent` to comma-separated text
- `formatTexture(texture)`: Convert `RegionTexture` to comma-separated text with attributes
- `formatVisual(visual)`: Convert `RegionVisual` to comma-separated text
- `formatFlavor(flavor)`: Convert `RegionFlavor` to comma-separated text
- `formatBodyMap(bodyMap)`: Convert entire `BodyMap` to multi-line text (one line per region/type)

### index.ts

Barrel export re-exporting all public functions from keywords, parsers, and formatters.

## Dependencies

### Internal (monorepo)

**@minimal-rpg/schemas** - Required for BodyMap-related types:

- `BodyMap`: Full body sensory data structure
- `BodyRegion`: Union of canonical body regions (head, face, hair, etc.)
- `RegionScent`: Scent data (primary, notes, intensity)
- `RegionTexture`: Texture data (primary, notes, temperature, moisture)
- `RegionVisual`: Visual data (description, features)
- `RegionFlavor`: Flavor data (primary, notes, intensity)
- `BODY_REGIONS`: Array of valid body region strings
- `resolveBodyRegion(input)`: Resolve aliases to canonical regions

### External

**zod** - Transitive dependency via @minimal-rpg/schemas (not directly imported)

## Usage Sites

### Direct Consumers

#### packages/web/src/features/character-builder/CharacterBuilder.tsx

- Imports `parseBodyEntries` from `@minimal-rpg/utils`
- Parses raw body text input from character builder form
- Converts natural language into `BodyMap` for CharacterProfile

#### packages/web/src/features/character-builder/hooks/useCharacterBuilderForm.ts

- Imports `formatScent`, `formatTexture`, `formatVisual`, `formatFlavor` from `@minimal-rpg/utils`
- Converts structured `BodyMap` data back to editable text entries in form state
- Used when loading existing character data into the form

### Re-exports

#### packages/utils/src/index.ts

- Re-exports all bodyParser functions via `export * from './bodyParser/index.js'`
- Makes bodyParser API available to consumers importing from `@minimal-rpg/utils`

### Related Documentation

#### packages/schemas/src/character/README.md

- Notes that bodyParser was moved from schemas to utils to maintain package purity (schemas should only contain data structures, not parsing logic)

#### packages/web/src/features/character-builder/README.md

- References `parseBodyEntries` in dependency table (though references outdated `@minimal-rpg/schemas` import)

## Example Usage

### Parsing Text to BodyMap

```typescript
import { parseBodyEntries } from '@minimal-rpg/utils';

const input = `
  hair: scent: strong musk, floral
  face: visual: freckled, bright green eyes
  hands: texture: calloused, warm, slightly damp
  neck: flavor: subtle salty, hint of sweet
`;

const result = parseBodyEntries(input);
console.log(result.bodyMap);
// {
//   hair: { scent: { primary: 'musk', notes: ['floral'], intensity: 0.8 } },
//   face: { visual: { description: 'freckled', features: ['bright green eyes'] } },
//   hands: { texture: { primary: 'calloused', temperature: 'warm', moisture: 'damp', notes: [] } },
//   neck: { flavor: { primary: 'salty', notes: ['sweet'], intensity: 0.25 } }
// }

console.log(result.warnings);
// [] (no parsing errors)
```

### Formatting BodyMap to Text

```typescript
import { formatBodyMap } from '@minimal-rpg/utils';
import type { BodyMap } from '@minimal-rpg/schemas';

const bodyMap: BodyMap = {
  hair: {
    scent: { primary: 'lavender', intensity: 0.6 },
  },
  hands: {
    texture: { primary: 'rough', temperature: 'cool', moisture: 'dry' },
  },
};

const text = formatBodyMap(bodyMap);
console.log(text);
// hair: scent: lavender
// hands: texture: rough, cool, dry
```

### Using Keyword Detection

```typescript
import { detectSensoryType, containsSensoryKeyword, SCENT_INDICATORS } from '@minimal-rpg/utils';

// Detect sensory type from player input
const type1 = detectSensoryType('I smell something musky');
console.log(type1); // "scent"

const type2 = detectSensoryType('The player is looking at their face');
console.log(type2); // "visual"

// Check for specific keywords with suffix awareness
const hasScent1 = containsSensoryKeyword('she smells the roses', SCENT_INDICATORS);
console.log(hasScent1); // true (matches "smell" -> "smells")

const hasScent2 = containsSensoryKeyword('the room was smelling of vanilla', SCENT_INDICATORS);
console.log(hasScent2); // true (matches "smell" -> "smelling")

const hasScent3 = containsSensoryKeyword('goodsmell is not a word', SCENT_INDICATORS);
console.log(hasScent3); // false (word boundary prevents match)
```

## Design Rationale

### Why in utils instead of schemas?

**Separation of concerns** - The schemas package should contain only data structure definitions (Zod schemas and TypeScript types). Parsing and formatting logic is runtime behavior that belongs in a utility package.

**Dependency direction** - Utils depends on schemas for types, but schemas remains pure and dependency-light. This prevents circular dependencies and keeps the domain model clean.

**Testability** - Parsing logic can be tested independently of schema validation. Changes to parsing behavior don't require schema version bumps.

### Why suffix-aware keyword matching?

**Maintainability** - Reduces keyword array sizes by ~60% (e.g., "smell"/"smells"/"smelling" → just "smell")

**Consistency** - Single source of truth for base keywords; conjugations handled automatically

**Accuracy** - Regex word boundaries prevent false positives in compound words or partial matches

**Performance** - Minimal overhead (regex compilation is cached per keyword, runs in O(n) where n = number of base keywords)

## Future Enhancements

Potential areas for expansion:

- **Intensity inference from adjectives**: Recognize "intense", "overpowering", "barely noticeable" without explicit intensity keywords
- **Multi-sensory line support**: Parse "hair: strong musky scent, soft silky texture" in single line
- **Comparison operators**: Support "warmer than", "as smooth as", "less pungent than" for relative descriptions
- **Validation hooks**: Optional callbacks for custom validation during parsing
- **Agent integration**: Export keywords for use in sensory-agent command detection (already planned, keywords are shared)

## Migration Notes

### v0.0.0 → Current

**Breaking change**: bodyParser moved from `@minimal-rpg/schemas` to `@minimal-rpg/utils`

**Action required**: Update imports:

```diff
- import { parseBodyEntries } from '@minimal-rpg/schemas';
+ import { parseBodyEntries } from '@minimal-rpg/utils';
```

**Compatibility**: `@minimal-rpg/utils` must be added as a dependency for packages using bodyParser.

**Completed migrations:**

- packages/web/src/features/character-builder/CharacterBuilder.tsx ✓
- packages/web/src/features/character-builder/hooks/useCharacterBuilderForm.ts ✓

## Architecture Context

This module is part of the **character creation and representation system**. Related components:

- **packages/schemas/src/character/body.ts**: Defines `BodyMap`, `BodyRegion`, sensory data schemas
- **packages/schemas/src/character/appearance.ts**: Defines `Physique` schema for height/build/age
- **packages/web/src/features/character-builder**: UI for character creation using bodyParser
- **packages/agents/src/sensory**: Future agent using `containsSensoryKeyword` for command detection

See [dev-docs/19-body-map-and-sensory-system.md](../../../../dev-docs/19-body-map-and-sensory-system.md) for broader architectural context.
