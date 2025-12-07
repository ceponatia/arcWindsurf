# Body Map and Sensory System

This document describes the body region taxonomy, sensory data structures, and how they integrate with intent detection and agent processing.

## Overview

The body map system provides atomic access to character body parts for realistic sensory descriptions. It enables:

- **Per-region sensory data**: Scent, texture, and visual descriptors for each body region
- **Natural language aliasing**: Maps common words to canonical body regions
- **Intent detection integration**: Extracts body part references from player input
- **Backwards compatibility**: Works alongside the legacy `scent` field

## Body Regions

Canonical body regions defined in `@minimal-rpg/schemas`:

| Region      | Description         | Common Aliases                            |
| ----------- | ------------------- | ----------------------------------------- |
| `head`      | Top of head, skull  | skull, scalp                              |
| `face`      | Facial features     | visage, features, eyes, nose, mouth, lips |
| `hair`      | Hair/scalp          | locks, tresses, mane                      |
| `neck`      | Neck area           | throat, nape                              |
| `shoulders` | Shoulder area       | shoulder                                  |
| `torso`     | Main body (default) | body, trunk, abdomen, stomach, belly      |
| `chest`     | Chest area          | breast, bosom, bust                       |
| `back`      | Back area           | spine, shoulderblades                     |
| `arms`      | Arms                | arm, bicep, forearm, elbow, wrist         |
| `hands`     | Hands               | hand, palm, fingers, knuckles             |
| `waist`     | Waist area          | -                                         |
| `hips`      | Hip area            | hip, pelvis, groin                        |
| `legs`      | Legs                | leg, thigh, calf, knee, shin, ankle       |
| `feet`      | Feet                | foot, toes, heel, sole                    |

## Schema Structure

### BodyMapSchema

The `BodyMapSchema` defines optional sensory data for each body region:

```ts
import { BodyMapSchema, type BodyMap } from '@minimal-rpg/schemas';

const characterBody: BodyMap = {
  hair: {
    scent: { primary: 'lavender shampoo', intensity: 0.6 },
    visual: { description: 'Long, wavy auburn hair' },
  },
  hands: {
    texture: { primary: 'calloused', temperature: 'warm' },
    visual: { description: 'Strong, weathered hands' },
  },
  feet: {
    scent: { primary: 'leather and road dust', intensity: 0.4 },
    texture: { primary: 'rough', temperature: 'cool' },
  },
};
```

### Region Sensory Data

Each region can have:

**RegionScent** (for smell intents):

- `primary`: Main scent note (required)
- `notes`: Additional scent notes (optional array)
- `intensity`: 0-1 scale (default 0.5)

**RegionTexture** (for touch intents):

- `primary`: Main texture (required)
- `temperature`: cold | cool | neutral | warm | hot
- `moisture`: dry | normal | damp | wet
- `notes`: Additional notes

**RegionVisual** (for look/examine intents):

- `description`: Visual description (required)
- `features`: Notable features/marks
- `skinCondition`: flawless | normal | freckled | scarred | tattooed | marked

## Integration with CharacterProfile

The `CharacterProfileSchema` now includes:

```ts
{
  // ... other fields ...

  // Legacy (deprecated but supported)
  scent: ScentSchema.optional(),

  // New body map with per-region sensory data
  body: BodyMapSchema.optional(),
}
```

When both `scent` and `body` are present, `body` takes precedence for sensory queries.

## Intent Detection

The governor's LLM intent detector now extracts `bodyPart` from player input:

```ts
// Player: "I sniff her hair"
{
  type: "smell",
  params: {
    target: "her",
    bodyPart: "hair"  // Extracted by LLM
  }
}
```

The `IntentParams` type includes:

```ts
interface IntentParams {
  // ... other fields ...

  /** Body part reference for sensory intents */
  bodyPart?: string | undefined;
}
```

## Body Region Resolution

Use `resolveBodyRegion()` to convert raw player input to canonical regions:

```ts
import { resolveBodyRegion, DEFAULT_BODY_REGION } from '@minimal-rpg/schemas';

// Direct canonical regions
resolveBodyRegion('hair'); // → 'hair'
resolveBodyRegion('feet'); // → 'feet'

// Aliases
resolveBodyRegion('locks'); // → 'hair'
resolveBodyRegion('belly'); // → 'torso'
resolveBodyRegion('toes'); // → 'feet'
resolveBodyRegion('palm'); // → 'hands'

// Default fallback
resolveBodyRegion(undefined); // → 'torso' (DEFAULT_BODY_REGION)
resolveBodyRegion('unknown'); // → 'torso'
```

## SensoryAgent Integration

The `SensoryAgent` uses body regions to extract targeted scent data:

1. **Extract body part** from `intent.params.bodyPart`
2. **Resolve to canonical region** using `resolveBodyRegion()`
3. **Query body map** for region-specific scent data
4. **Fall back to torso** if no region-specific data exists

Example flow for "I smell her hair":

```text
Player Input: "I smell her hair"
    ↓
Intent Detection: { type: "smell", params: { target: "her", bodyPart: "hair" } }
    ↓
Body Region Resolution: "hair" → "hair"
    ↓
Knowledge Context Query: Look for "body.hair.scent" or "scent.hairScent"
    ↓
Narrative Generation: "Her hair carries a light lavender scent..."
```

## Helper Functions

### getRegionScent()

Get scent for a region with fallback to torso:

```ts
import { getRegionScent, type BodyMap } from '@minimal-rpg/schemas';

const scent = getRegionScent(characterBody, 'feet');
// Returns feet scent, or falls back to torso scent if none
```

### buildLegacyScentSummary()

Convert body map to legacy scent format (for backwards compatibility):

```ts
import { buildLegacyScentSummary } from '@minimal-rpg/schemas';

const legacy = buildLegacyScentSummary(characterBody);
// → { hairScent: "lavender shampoo", bodyScent: "...", perfume: "..." }
```

### isBodyReference()

Check if a string is a valid body region or alias:

```ts
import { isBodyReference } from '@minimal-rpg/schemas';

isBodyReference('hair'); // true
isBodyReference('locks'); // true (alias)
isBodyReference('pizza'); // false
```

## Migration from Legacy Scent

Existing characters with `scent` field continue to work. To migrate:

```ts
// Old format
{
  scent: {
    hairScent: "lavender",
    bodyScent: "clean soap",
    perfume: "jasmine"
  }
}

// New format (recommended)
{
  body: {
    hair: {
      scent: { primary: "lavender", intensity: 0.6 }
    },
    torso: {
      scent: { primary: "clean soap", intensity: 0.4 }
    },
    neck: {
      scent: { primary: "jasmine perfume", intensity: 0.7 }
    }
  }
}
```

## Future Extensions

The body map architecture supports future sensory expansions:

- **Touch intents**: Use `texture` data for "I touch her hands"
- **Visual intents**: Use `visual` data for "I look at his face"
- **Combined queries**: "Describe how she looks and smells"

Each sensory intent type can leverage the same body region resolution system, ensuring consistent natural language handling across all senses.
