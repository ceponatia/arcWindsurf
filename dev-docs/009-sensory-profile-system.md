# Sensory Profile System Design

> **Created**: January 18, 2026
> **Status**: Design Phase
> **Related**: `@/home/brian/projects/arcWindsurf/packages/schemas/src/character/sensory.ts`

---

## Problem Statement

The current sensory system (`BodyMap` with `scent`, `texture`, `flavor`, `visual` per region) is powerful but requires users to manually populate dozens of fields across 20+ body regions. This creates:

- **Cognitive overload**: Users must think about scent/texture/flavor for every body part
- **Incomplete profiles**: Most users leave sensory data empty, making the feature underutilized
- **Repetitive work**: Similar characters (same race/gender/age) require re-entering similar data

## Goal

Create an intelligent **Sensory Profile System** that:

1. Auto-generates sensible defaults based on character attributes
2. Allows progressive customization (override what you want, keep defaults for the rest)
3. Exposes full control for power users without cluttering the main UI
4. Feels like a "living" system where profiles evolve based on context

---

## Approach 1: Hierarchical Trait Composition

### Concept

Build sensory profiles by layering **trait fragments** in priority order. Each fragment contributes partial data that gets merged following a defined precedence.

### Architecture

```typescript
interface SensoryFragment {
  id: string;
  name: string;
  description: string;
  priority: number; // Higher = applied later (overrides lower)

  // Partial sensory contributions
  scent?: Partial<Record<BodyRegion, Partial<RegionScent>>>;
  texture?: Partial<Record<BodyRegion, Partial<RegionTexture>>>;
  flavor?: Partial<Record<BodyRegion, Partial<RegionFlavor>>>;
  visual?: Partial<Record<BodyRegion, Partial<RegionVisual>>>;

  // Modifiers (applied after base values)
  modifiers?: {
    scentIntensity?: number; // Multiplier: 0.5 = half intensity
    temperatureBias?: 'cold' | 'cool' | 'warm' | 'hot';
  };
}

interface SensoryTraitSource {
  sourceType: 'race' | 'gender' | 'age' | 'physique' | 'occupation' | 'custom';
  sourceValue: string;
  fragment: SensoryFragment;
}
```

### Resolution Pipeline

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Sensory Resolution Pipeline                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. BASE LAYER (Race)                                           │
│     └─► Elf: earthy scents, smooth texture, herbal flavor       │
│                                                                  │
│  2. GENDER LAYER                                                │
│     └─► Female: floral notes blend, softer texture modifiers    │
│                                                                  │
│  3. AGE LAYER                                                   │
│     └─► Young (18-25): fresh intensity, smooth texture boost    │
│                                                                  │
│  4. PHYSIQUE LAYER                                              │
│     └─► Athletic: musk undertones, firm texture                 │
│                                                                  │
│  5. OCCUPATION LAYER (optional)                                 │
│     └─► Blacksmith: smoke/metal scents on hands/arms            │
│                                                                  │
│  6. CUSTOM OVERRIDES (user-specified)                           │
│     └─► User's explicit per-region overrides                    │
│                                                                  │
│  ══════════════════════════════════════════════════════════════ │
│                                                                  │
│  OUTPUT: Fully resolved BodyMap with all sensory data           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Merge Strategy

```typescript
type MergeStrategy = 'replace' | 'blend' | 'augment';

interface MergeConfig {
  scent: {
    primary: 'replace'; // Later layer wins
    notes: 'augment'; // Combine arrays, dedupe
    intensity: 'blend'; // Average values
  };
  texture: {
    primary: 'replace';
    temperature: 'replace';
    moisture: 'replace';
    notes: 'augment';
  };
  flavor: {
    primary: 'replace';
    notes: 'augment';
    intensity: 'blend';
  };
  visual: {
    primary: 'replace';
    notes: 'augment';
    intensity: 'blend';
  };
}
```

### Conditional Augmentation (Trait Interactions)

The merge strategy above is great for predictable defaults, but it can still feel static. A "living" sensory profile needs _interaction_: how one trait changes the expression of another.

Instead of treating augmentation as "just append notes", introduce a dedicated **augmentation pass** that runs after the base merge and applies **conditional transformations** based on multiple traits at once (race + age + activity level, occupation + climate, alignment expression + ritual practice, etc.).

This keeps the system deterministic and inspectable, but makes results feel more contextual for NPCs.

#### Key idea

- **Fragments** provide baseline contributions (race, gender, age, physique, occupation).
- **Augmentation rules** transform the _already-merged_ result based on overall character context.

This enables effects like:

- Elf baseline "earthy" scent -> becomes "fresh pine needles" for young elves, "aged roots" for elders.
- Athletic/exertion context adds salt/heat and changes texture/visual too (damp skin, flushed tone).
- Devout/ritualistic alignment expression adds incense notes or ash/soot traces as a learned practice.

#### Augment Notes from PM (expanded)

One way we could augment is by having definitions for how some scents change when another variable is added. Using your example of Elf above: Earthy scents. If the age is young, the earthy scents value could be augmented to be 'fresh pine needles', 'cocoa', and so on. If the age is old (>60), the earthy scent could be augmented to be 'aged roots', 'late spring moss', etc. This would require a more complex fragment definition that includes conditional augmentations based on other traits. If an athletic trait was added to that elf, the scent would be augmented to make the earth scent values more musky and heady. Think 'salty loam', 'ripe mushrooms', etc.

#### What "augmentation" can mean (beyond scent)

Augmentation is a transformation, not just a merge. Examples across modalities:

- **Scent**: swap primary based on context, inject notes, scale intensity, add edge notes (salt, smoke).
- **Texture**: shift moisture/temperature after exertion, add callouses/scars from occupation, soften with wealth.
- **Flavor**: add bitterness from herbs/tobacco, sweetness from diet, metallic tang from ironwork.
- **Visual**: add sheen (sweat/oil), dullness (dust/ash), redness (heat), pallor (cold), stains (ink/soot).

#### Data model: augmentation rules

Model augmentations explicitly so they are testable and deterministic.

```typescript
type SensoryModality = 'scent' | 'texture' | 'flavor' | 'visual';

type RegionSelector =
  | { kind: 'region'; region: BodyRegion }
  | { kind: 'regions'; regions: BodyRegion[] }
  | { kind: 'tag'; tag: 'exposed-skin' | 'contact-hands' | 'breath-adjacent' | 'hair-adjacent' };

type ConditionOp = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'contains';

interface TraitCondition {
  key:
    | 'race'
    | 'gender'
    | 'age'
    | 'ageCategory'
    | 'physique'
    | 'occupation'
    | 'activityLevel'
    | 'alignment'
    | 'environment'
    | 'hygieneLevel'
    | 'timeSinceBathMinutes';
  op: ConditionOp;
  value: unknown;
}

type AugmentOperation =
  | {
      kind: 'scent.addNotes';
      notes: string[];
      dedupe?: boolean;
    }
  | {
      kind: 'scent.replacePrimaryIf';
      ifPrimaryIn: string[];
      replaceWith: string;
    }
  | {
      kind: 'intensity.scale';
      modality: Extract<SensoryModality, 'scent' | 'flavor' | 'visual'>;
      factor: number;
      clamp?: { min: number; max: number };
    }
  | {
      kind: 'texture.shift';
      temperature?: RegionTexture['temperature'];
      moisture?: RegionTexture['moisture'];
      addNotes?: string[];
    }
  | {
      kind: 'visual.addNotes';
      notes: string[];
      dedupe?: boolean;
    };

interface SensoryAugmentRule {
  id: string;
  description: string;
  priority: number; // Like fragments: later wins when rules conflict
  when: TraitCondition[]; // AND; add anyOf/nested logic later if needed
  target: {
    modality: SensoryModality;
    regions: RegionSelector;
  };
  operations: AugmentOperation[];
}
```

Notes:

- This rule system is intentionally not tied to scent strings alone.
- Region selectors can be semantic ("exposed-skin") so we do not have to enumerate 20+ regions in every rule.
- Start with AND-only conditions; add `anyOf` when the fragment library grows.

#### Resolution pipeline (updated)

```text
1. Collect base fragments from traits (race, gender, age, physique, occupation, etc.)
2. Merge fragments by priority using MergeConfig (replace/blend/augment)
3. Build TraitContext (derived features like ageCategory, activityLevel)
4. Apply augmentation rules by priority (transform the merged result)
5. Apply custom overrides last (always highest priority)
```

#### Example augmentation rules

These examples show the multi-modality benefit: texture and visual shift too.

```typescript
const AUGMENT_RULES: SensoryAugmentRule[] = [
  {
    id: 'elf-earthy-young',
    description: 'Young elf earthy notes read fresher and sweeter',
    priority: 1000,
    when: [
      { key: 'race', op: 'eq', value: 'Elf' },
      { key: 'ageCategory', op: 'eq', value: 'young' },
    ],
    target: {
      modality: 'scent',
      regions: { kind: 'tag', tag: 'exposed-skin' },
    },
    operations: [
      {
        kind: 'scent.replacePrimaryIf',
        ifPrimaryIn: ['petrichor', 'forest loam', 'earth', 'earthy'],
        replaceWith: 'fresh pine needles',
      },
      { kind: 'scent.addNotes', notes: ['cocoa', 'morning sap'], dedupe: true },
      { kind: 'intensity.scale', modality: 'scent', factor: 0.9, clamp: { min: 0, max: 1 } },
    ],
  },
  {
    id: 'elf-earthy-elder',
    description: 'Elder elf earthy notes skew mossy and root-aged',
    priority: 1000,
    when: [
      { key: 'race', op: 'eq', value: 'Elf' },
      { key: 'age', op: 'gt', value: 60 },
    ],
    target: {
      modality: 'scent',
      regions: { kind: 'tag', tag: 'exposed-skin' },
    },
    operations: [
      {
        kind: 'scent.replacePrimaryIf',
        ifPrimaryIn: ['petrichor', 'forest loam', 'earth', 'earthy'],
        replaceWith: 'aged roots',
      },
      { kind: 'scent.addNotes', notes: ['late spring moss', 'dried bark'], dedupe: true },
      { kind: 'intensity.scale', modality: 'scent', factor: 1.1, clamp: { min: 0, max: 1 } },
    ],
  },
  {
    id: 'recent-exertion-scent',
    description: 'Recent exertion adds salt and warm-skin notes',
    priority: 1100,
    when: [
      { key: 'activityLevel', op: 'in', value: ['high', 'extreme'] },
      { key: 'timeSinceBathMinutes', op: 'gt', value: 30 },
    ],
    target: {
      modality: 'scent',
      regions: { kind: 'tag', tag: 'exposed-skin' },
    },
    operations: [
      { kind: 'scent.addNotes', notes: ['salt', 'warm skin'], dedupe: true },
      { kind: 'intensity.scale', modality: 'scent', factor: 1.2, clamp: { min: 0, max: 1 } },
    ],
  },
  {
    id: 'recent-exertion-texture',
    description: 'Recent exertion makes skin warmer and slightly damp',
    priority: 1100,
    when: [
      { key: 'activityLevel', op: 'in', value: ['high', 'extreme'] },
      { key: 'timeSinceBathMinutes', op: 'gt', value: 30 },
    ],
    target: {
      modality: 'texture',
      regions: { kind: 'tag', tag: 'exposed-skin' },
    },
    operations: [
      {
        kind: 'texture.shift',
        temperature: 'warm',
        moisture: 'damp',
        addNotes: ['post-exertion heat'],
      },
    ],
  },
  {
    id: 'recent-exertion-visual',
    description: 'Recent exertion adds a light sheen and mild flush',
    priority: 1100,
    when: [
      { key: 'activityLevel', op: 'in', value: ['high', 'extreme'] },
      { key: 'timeSinceBathMinutes', op: 'gt', value: 30 },
    ],
    target: {
      modality: 'visual',
      regions: { kind: 'tag', tag: 'exposed-skin' },
    },
    operations: [
      { kind: 'visual.addNotes', notes: ['light sheen', 'mild flush'], dedupe: true },
      { kind: 'intensity.scale', modality: 'visual', factor: 1.1, clamp: { min: 0, max: 1 } },
    ],
  },
];
```

#### Why this helps NPCs specifically

NPC sensory profiles often need to reflect what they have been doing lately, not just their archetype. The augmentation layer is a clean home for stateful signals like:

- **Activity**: just fought, just traveled, just slept, just ate, just bathed.
- **Environment**: rain, desert dust, smoke-filled tavern, sea air.
- **Social context**: access to fragrance, clean clothes, lotions.
- **Belief/alignment expression**: incense/oils/ritual ash as a learned practice rather than a moral label.

This layer also supports gradual change: a rule can depend on `timeSinceBathMinutes` and apply different intensities over time.

#### Guardrails

- Keep augmentation rules curated (start with a small set of high-impact rules).
- Prefer semantic tags ("exposed-skin") to reduce maintenance.
- Ensure rule effects are deterministic and clamped (intensities stay in 0-1).
- Avoid stereotypes as direct trait-to-sensory mappings; route sensitive cases through occupation, environment, and explicit user-authored fragments.

### Example Fragment Library

```typescript
const RACE_FRAGMENTS: Record<Race, SensoryFragment> = {
  Elf: {
    id: 'race-elf',
    name: 'Elven Heritage',
    priority: 100,
    scent: {
      hair: { primary: 'forest leaves', notes: ['morning dew'] },
      skin: { primary: 'petrichor', intensity: 0.3 },
      breath: { primary: 'mint', intensity: 0.4 },
    },
    texture: {
      skin: { primary: 'silk-smooth', temperature: 'cool' },
      hair: { primary: 'fine, flowing' },
    },
    flavor: {
      lips: { primary: 'honey-sweet', intensity: 0.3 },
      skin: { primary: 'clean, faintly sweet' },
    },
  },

  Dwarf: {
    id: 'race-dwarf',
    name: 'Dwarven Heritage',
    priority: 100,
    scent: {
      hair: { primary: 'oak and ale', notes: ['iron'] },
      skin: { primary: 'stone dust', intensity: 0.4 },
      hands: { primary: 'forge smoke', intensity: 0.6 },
    },
    texture: {
      skin: { primary: 'weathered, tough', temperature: 'warm' },
      hands: { primary: 'calloused, strong' },
    },
    modifiers: {
      temperatureBias: 'warm',
    },
  },
  // ... more races
};

const AGE_FRAGMENTS: Record<AgeCategory, SensoryFragment> = {
  young: {
    id: 'age-young',
    name: 'Youthful Vitality',
    priority: 200,
    scent: {
      skin: { notes: ['fresh', 'clean'], intensity: 0.4 },
    },
    texture: {
      skin: { primary: 'smooth', moisture: 'normal' },
      face: { primary: 'soft, unblemished' },
    },
    modifiers: {
      scentIntensity: 0.8, // Younger = less pronounced scent
    },
  },

  mature: {
    id: 'age-mature',
    name: 'Seasoned Character',
    priority: 200,
    texture: {
      face: { primary: 'character lines', notes: ['experience'] },
      hands: { primary: 'capable, worn' },
    },
    modifiers: {
      scentIntensity: 1.1,
    },
  },
  // ... more age categories
};
```

### Pros & Cons

| Pros                                    | Cons                                |
| --------------------------------------- | ----------------------------------- |
| Predictable, rule-based                 | Requires extensive fragment library |
| Easy to understand merge order          | Can feel "formulaic"                |
| Power users can inspect/modify pipeline | Complex edge cases in merging       |
| Extensible via new fragment types       | Maintenance burden for fragments    |

---

## Approach 2: Semantic Profile Templates

### Concept

Instead of building from atomic traits, define **holistic sensory archetypes** that users select or blend. Templates are complete sensory profiles that can be mixed.

### Architecture

```typescript
interface SensoryTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[]; // For search/filtering

  // Complete sensory profile
  profile: BodyMap;

  // Compatibility hints
  suggestedFor: {
    races?: Race[];
    genders?: Gender[];
    ageRanges?: [number, number][];
    occupations?: string[];
  };

  // Blending weight when combined with other templates
  blendWeight: number;
}

interface TemplateBlend {
  templates: { templateId: string; weight: number }[];
  customOverrides: Partial<BodyMap>;
}
```

### Template Gallery

```typescript
const SENSORY_TEMPLATES: SensoryTemplate[] = [
  {
    id: 'woodland-spirit',
    name: 'Woodland Spirit',
    description: 'Earthy, natural scents with hints of flowers and rain',
    tags: ['nature', 'forest', 'elf', 'druid', 'ranger'],
    suggestedFor: {
      races: ['Elf', 'Half-Elf'],
      occupations: ['ranger', 'druid', 'herbalist'],
    },
    profile: {
      hair: {
        scent: { primary: 'wildflowers', notes: ['rain', 'cedar'], intensity: 0.5 },
        texture: { primary: 'silken', moisture: 'normal' },
      },
      skin: {
        scent: { primary: 'forest loam', notes: ['moss'], intensity: 0.3 },
        texture: { primary: 'cool, smooth', temperature: 'cool' },
        flavor: { primary: 'clean earth', intensity: 0.2 },
      },
      // ... complete profile
    },
    blendWeight: 1.0,
  },

  {
    id: 'forge-worker',
    name: 'Forge Worker',
    description: 'Smoky, metallic notes with warmth radiating from skin',
    tags: ['industrial', 'smith', 'dwarf', 'fire', 'metal'],
    suggestedFor: {
      races: ['Dwarf', 'Human'],
      occupations: ['blacksmith', 'armorer', 'artificer'],
    },
    profile: {
      hands: {
        scent: { primary: 'hot iron', notes: ['coal', 'leather'], intensity: 0.7 },
        texture: { primary: 'heavily calloused', temperature: 'warm' },
      },
      arms: {
        scent: { primary: 'forge smoke', intensity: 0.5 },
        texture: { primary: 'sinewy, scarred', temperature: 'warm' },
      },
      face: {
        scent: { primary: 'soot', notes: ['sweat'], intensity: 0.4 },
        texture: { primary: 'weather-beaten', temperature: 'warm' },
      },
      // ... complete profile
    },
    blendWeight: 1.0,
  },

  {
    id: 'noble-refined',
    name: 'Noble Refinement',
    description: 'Perfumed, pampered, with undertones of wealth',
    tags: ['noble', 'royal', 'wealthy', 'perfume', 'silk'],
    // ... profile
  },

  {
    id: 'ocean-touched',
    name: 'Ocean Touched',
    description: 'Salt, sea breeze, and the depths',
    tags: ['sailor', 'pirate', 'coastal', 'sea', 'fish'],
    // ... profile
  },
];
```

### Blending Algorithm

```typescript
function blendTemplates(blend: TemplateBlend): BodyMap {
  const result: BodyMap = {};

  // Normalize weights
  const totalWeight = blend.templates.reduce((sum, t) => sum + t.weight, 0);

  for (const region of BODY_REGIONS) {
    const blendedRegion: BodyRegionData = {};

    for (const { templateId, weight } of blend.templates) {
      const template = getTemplate(templateId);
      const regionData = template.profile[region];

      if (regionData) {
        const normalizedWeight = weight / totalWeight;

        // Blend scents: pick primary from highest weight, combine notes
        if (regionData.scent) {
          blendedRegion.scent = blendScents(
            blendedRegion.scent,
            regionData.scent,
            normalizedWeight
          );
        }

        // Similar for texture, flavor, visual
      }
    }

    // Apply user overrides last
    if (blend.customOverrides[region]) {
      Object.assign(blendedRegion, blend.customOverrides[region]);
    }

    result[region] = blendedRegion;
  }

  return result;
}
```

### UI Concept: Template Mixer

```text
┌─────────────────────────────────────────────────────────────┐
│  Sensory Profile Mixer                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ACTIVE TEMPLATES                           PREVIEW          │
│  ┌────────────────────────────────┐        ┌──────────────┐ │
│  │ ⚪ Woodland Spirit    [====70%]│        │   👤 Hair:   │ │
│  │ ⚪ Noble Refinement   [==30%  ]│        │   lavender & │ │
│  │                                │        │   wildflower │ │
│  │ [+ Add Template]               │        │              │ │
│  └────────────────────────────────┘        │   Skin:      │ │
│                                            │   cool silk  │ │
│  SUGGESTED FOR: Elf, Female, Noble         │   with earth │ │
│                                            │              │ │
│  ─────────────────────────────────         │   Hands:     │ │
│                                            │   soft, warm │ │
│  TEMPLATE GALLERY                          └──────────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│  │🌲Forest │ │⚒️Forge  │ │👑Noble  │                        │
│  │ Spirit  │ │ Worker  │ │Refined  │                        │
│  └─────────┘ └─────────┘ └─────────┘                        │
│                                                              │
│  [Fine-Tune Individual Regions...]                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pros & Cons

| Pros                            | Cons                               |
| ------------------------------- | ---------------------------------- |
| Intuitive "vibe" selection      | Less granular control              |
| Creative mixing possibilities   | Templates may not fit all concepts |
| Faster character creation       | Blending can produce odd results   |
| Easy to add community templates | Requires good template library     |

---

## Approach 3: AI-Driven Sensory Generation

### Concept

Use the LLM to generate contextually appropriate sensory profiles based on character description, then cache/refine results.

### Architecture

```typescript
interface SensoryGenerationRequest {
  character: {
    name: string;
    race: Race;
    gender: Gender;
    age: number;
    occupation?: string;
    backstory?: string;
    personality?: string;
    physique?: Physique;
  };

  // Optional constraints
  constraints?: {
    tone: 'subtle' | 'vivid' | 'intense';
    avoidTerms?: string[];
    emphasizeRegions?: BodyRegion[];
  };

  // Regions to generate (all if empty)
  targetRegions?: BodyRegion[];
}

interface SensoryGenerationResult {
  generatedProfile: Partial<BodyMap>;
  reasoning: string; // Why these choices were made
  suggestedAlternatives: {
    region: BodyRegion;
    alternatives: RegionScent[] | RegionTexture[] | RegionFlavor[];
  }[];
}
```

### Generation Prompt Template

```typescript
const SENSORY_GENERATION_PROMPT = `
You are a sensory description specialist for a fantasy RPG character system.
Generate realistic, evocative sensory profiles based on character attributes.

CHARACTER:
- Name: {{name}}
- Race: {{race}}
- Gender: {{gender}}
- Age: {{age}}
- Occupation: {{occupation}}
- Physique: {{physique}}
- Backstory: {{backstory}}

CONSTRAINTS:
- Tone: {{tone}}
- Regions to focus on: {{targetRegions}}

Generate sensory data for each body region following this schema:
- scent: { primary: string, notes?: string[], intensity: 0-1 }
- texture: { primary: string, temperature: cold|cool|neutral|warm|hot, moisture: dry|normal|damp|wet }
- flavor: { primary: string, notes?: string[], intensity: 0-1 }

Consider:
1. How race affects baseline scents (elves = nature, dwarves = earth/metal)
2. How occupation leaves physical traces (blacksmith = soot, scholar = ink)
3. How age affects skin texture and scent intensity
4. How physique affects warmth and moisture

Respond with JSON matching the BodyMap schema.
`;
```

### Caching & Refinement

```typescript
interface CachedSensoryProfile {
  characterHash: string; // Hash of input attributes
  generatedAt: Date;
  profile: BodyMap;
  userRefinements: Partial<BodyMap>; // User's manual edits
  regenerationCount: number;
}

// Store in database for reuse
const sensoryProfileCache = new Map<string, CachedSensoryProfile>();

async function getOrGenerateSensory(request: SensoryGenerationRequest): Promise<BodyMap> {
  const hash = computeCharacterHash(request.character);
  const cached = sensoryProfileCache.get(hash);

  if (cached && !isStale(cached)) {
    // Merge cached generation with user refinements
    return mergeProfiles(cached.profile, cached.userRefinements);
  }

  // Generate new profile via LLM
  const generated = await generateSensoryProfile(request);

  // Cache for future use
  sensoryProfileCache.set(hash, {
    characterHash: hash,
    generatedAt: new Date(),
    profile: generated.generatedProfile,
    userRefinements: {},
    regenerationCount: 0,
  });

  return generated.generatedProfile;
}
```

### UI: Regenerate & Refine

```text
┌─────────────────────────────────────────────────────────────┐
│  AI Sensory Profile                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🤖 Generated based on: Elf, Female, 127 years,       │   │
│  │    Herbalist background                               │   │
│  │                                                       │   │
│  │ "I chose earthy, botanical notes to reflect her      │   │
│  │  long communion with nature. The coolness of her     │   │
│  │  skin suggests elven physiology..."                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  HAIR                                            [🔄 Regen]  │
│  ├─ Scent: meadow flowers & morning dew           [✏️ Edit] │
│  └─ Texture: fine, silken strands                 [✏️ Edit] │
│                                                              │
│  SKIN                                            [🔄 Regen]  │
│  ├─ Scent: petrichor with herbal undertones       [✏️ Edit] │
│  ├─ Texture: cool, impossibly smooth              [✏️ Edit] │
│  └─ Flavor: faintly sweet, like honeysuckle       [✏️ Edit] │
│                                                              │
│  [🔄 Regenerate All] [📋 Copy to Manual Editor]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pros & Cons

| Pros                           | Cons                          |
| ------------------------------ | ----------------------------- |
| Highly contextual results      | LLM latency and cost          |
| Handles unique combinations    | Non-deterministic outputs     |
| Creative, varied descriptions  | May require content filtering |
| No manual fragment maintenance | Harder to ensure consistency  |

---

## Approach 4: Sensory DNA Strings

### Concept

Encode sensory profiles as compact "DNA strings" that can be shared, evolved, and recombined like genetic material.

### Architecture

```typescript
// Compact encoding: each gene represents a sensory trait
type SensoryGene = string; // e.g., "S:FLORAL:0.6" = Scent:Floral:60%

interface SensoryDNA {
  version: '1.0';
  genes: SensoryGene[];

  // Metadata
  name?: string;
  author?: string;
  parentDNA?: [string, string]; // For breeding/crossover
}

// Gene format: TYPE:VALUE:INTENSITY:REGION?
// Examples:
// "S:EARTHY:0.4:skin"     - Earthy scent on skin at 40%
// "T:SMOOTH:warm:*"       - Smooth warm texture everywhere
// "F:SWEET:0.3:lips"      - Sweet flavor on lips at 30%
// "M:INTENSITY:0.8"       - Global intensity modifier 80%
```

### DNA Operations

```typescript
// Crossover: combine two DNA strings
function crossover(dna1: SensoryDNA, dna2: SensoryDNA): SensoryDNA {
  const childGenes: SensoryGene[] = [];

  // Take genes from each parent with some randomization
  const allGenes = [...dna1.genes, ...dna2.genes];
  const genesByRegion = groupBy(allGenes, extractRegion);

  for (const [region, genes] of Object.entries(genesByRegion)) {
    // Pick one gene per type per region from either parent
    const selected = selectDominantGenes(genes);
    childGenes.push(...selected);
  }

  return {
    version: '1.0',
    genes: childGenes,
    parentDNA: [dna1.genes.join('|'), dna2.genes.join('|')],
  };
}

// Mutation: randomly modify genes
function mutate(dna: SensoryDNA, mutationRate: number = 0.1): SensoryDNA {
  const mutatedGenes = dna.genes.map((gene) => {
    if (Math.random() < mutationRate) {
      return mutateGene(gene);
    }
    return gene;
  });

  return { ...dna, genes: mutatedGenes };
}

// Decode DNA to BodyMap
function decodeDNA(dna: SensoryDNA): BodyMap {
  const result: BodyMap = {};

  for (const gene of dna.genes) {
    const [type, value, intensity, region] = parseGene(gene);
    applyGeneToBodyMap(result, type, value, intensity, region);
  }

  return result;
}
```

### DNA Sharing & Discovery

```typescript
interface DNALibrary {
  // Pre-built DNA strings for common archetypes
  archetypes: Record<string, SensoryDNA>;

  // Community-shared DNA
  community: {
    dna: SensoryDNA;
    downloads: number;
    rating: number;
    tags: string[];
  }[];

  // User's personal DNA collection
  personal: SensoryDNA[];
}

// Share as compact string
function exportDNA(dna: SensoryDNA): string {
  return btoa(JSON.stringify(dna)); // Base64 encoded
}

function importDNA(encoded: string): SensoryDNA {
  return JSON.parse(atob(encoded));
}
```

### UI: DNA Lab

```text
┌─────────────────────────────────────────────────────────────┐
│  Sensory DNA Lab                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  MY DNA: [S:FLORAL:0.4:hair|T:SMOOTH:cool:skin|F:SWEET:0.3] │
│          [📋 Copy] [📤 Share] [📥 Import]                   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  BREEDING LAB                                                │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Parent A   │  +  │  Parent B   │  =  │   Child     │   │
│  │  Woodland   │     │  Noble      │     │  [Preview]  │   │
│  │  Spirit     │     │  Refined    │     │             │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                              │
│  [🧬 Breed] [🎲 Mutate Child] [✓ Accept]                    │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  GENE EDITOR                                                 │
│  [S:FLORAL:0.4:hair]  →  Scent / Floral / 40% / Hair        │
│  [T:SMOOTH:cool:skin] →  Texture / Smooth / Cool / Skin     │
│  [+ Add Gene] [🎲 Random Gene]                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pros & Cons

| Pros                       | Cons                                |
| -------------------------- | ----------------------------------- |
| Highly shareable/portable  | Learning curve for users            |
| Unique "breeding" mechanic | Abstracted from actual descriptions |
| Encourages experimentation | Debugging bad DNA is hard           |
| Compact storage            | May feel too "gamey"                |

---

## Approach 5: Dual-Layer System (Recommended Hybrid)

### Concept

Combine the best aspects: **hierarchical defaults** for zero-config experience + **template blending** for creative control + **JSON expert mode** for power users.

### Architecture

```typescript
interface SensoryProfileConfig {
  // Layer 1: Auto-computed from character attributes
  autoDefaults: {
    enabled: boolean;
    sources: ('race' | 'gender' | 'age' | 'physique' | 'occupation')[];
  };

  // Layer 2: User-selected template blend
  templateBlend?: {
    templates: { id: string; weight: number }[];
  };

  // Layer 3: Fine-grained overrides
  customOverrides: Partial<BodyMap>;

  // Resolution preference
  conflictResolution: 'auto-wins' | 'template-wins' | 'custom-wins';
}

// Resolution order (later wins unless conflictResolution says otherwise):
// 1. Auto defaults (race → gender → age → physique → occupation)
// 2. Template blend
// 3. Custom overrides (always highest priority)
```

### UI Modes

```text
┌─────────────────────────────────────────────────────────────┐
│  Sensory Profile                                [Mode: ▼]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  MODE: Simple (Automatic)                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ✓ Based on: Elf + Female + Young + Athletic          │   │
│  │                                                       │   │
│  │ Your character has been assigned sensory traits      │   │
│  │ appropriate for their race, gender, and physique.    │   │
│  │                                                       │   │
│  │ [Preview Profile] [Switch to Custom Mode]            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ═══════════════════════════════════════════════════════════│
│                                                              │
│  MODE: Template Mixer                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Start with auto-defaults, then blend templates:      │   │
│  │                                                       │   │
│  │ [Woodland Spirit ════════70%]                        │   │
│  │ [Noble Refined   ════30%    ]                        │   │
│  │                                                       │   │
│  │ [+ Add Template] [Preview] [Apply]                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ═══════════════════════════════════════════════════════════│
│                                                              │
│  MODE: Expert (JSON)                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ {                                                     │   │
│  │   "hair": {                                           │   │
│  │     "scent": { "primary": "lavender", ... }          │   │
│  │   },                                                  │   │
│  │   "skin": { ... }                                     │   │
│  │ }                                                     │   │
│  │                                                       │   │
│  │ [Validate] [Reset to Auto] [Apply]                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Hierarchical Defaults

- Create fragment library for races, genders, age categories
- Implement merge pipeline
- Auto-apply on character creation
- Store resolved profile in `characterProfile.body`

#### Phase 2: Template System

- Build template gallery (10-15 core templates)
- Implement blending algorithm
- Add template mixer UI

#### Phase 3: Expert Mode

- JSON editor with schema validation
- Import/export functionality
- Full manual control

---

## Data Storage Considerations

### Option A: Store Resolved Profile Only

```typescript
// In CharacterProfile
body: BodyMap; // Fully resolved sensory data
```

- Pros: Simple, self-contained
- Cons: Loses provenance, can't re-resolve

### Option B: Store Config + Resolved

```typescript
// In CharacterProfile
sensoryConfig: SensoryProfileConfig; // How it was generated
body: BodyMap; // Resolved result (cached)
```

- Pros: Can re-resolve when fragments update
- Cons: More complex, potential drift

### Option C: Store Config Only, Resolve at Runtime

```typescript
// In CharacterProfile
sensoryConfig: SensoryProfileConfig;
// body is computed property, never stored
```

- Pros: Always up-to-date with fragment library
- Cons: Performance hit, non-deterministic if fragments change

**Recommendation**: Option B - store both config and resolved profile, re-resolve on explicit user action.

---

## Migration Path

1. **Existing characters**: Auto-populate `sensoryConfig` based on their race/gender/age
2. **Manual `body` data**: Preserve as `customOverrides`, don't overwrite
3. **New characters**: Start with auto-defaults, prompt for template selection

---

## Next Steps

1. Design fragment data structure and create initial library
2. Implement merge pipeline in `@minimal-rpg/schemas`
3. Add `sensoryConfig` to character profile schema
4. Build "Simple" mode UI first
5. Iterate on template mixer
6. Add JSON expert mode last

---

## Implementation Validation (January 20, 2026)

After reviewing the codebase, the following updates are required to align with existing patterns:

### Schema Integration Points ✅

1. **Existing infrastructure confirmed**:
   - `CharacterProfile` with `body?: BodyMap` and `hygiene?: NpcHygieneState` ✅
   - `resolveRegionScent()` pattern in `packages/schemas/src/character/scent/resolvers.ts` ✅
   - Hygiene modifier schemas with augmentation semantics ✅

2. **Character Studio compatibility**:
   - Preact Signals for state management ✅
   - `updateProfile()` action pattern ✅
   - `BodyCard` edits only visual descriptions—new card can coexist ✅

### Required Schema Changes

#### 1. Add `occupation` field

**Current state**: `CharacterProfile` lacks occupation field referenced throughout the design.

**Change**: Add to `CharacterBasicsSchema`:
```typescript
// In packages/schemas/src/character/basics.ts
occupation: z.string().optional(),
```

This enables occupation-based fragments (blacksmith, sailor, herbalist, etc.) and benefits NPC generation.

#### 2. Add `AgeCategory` derivation

**Current state**: Design references `ageCategory` but CharacterProfile only has numeric `age`.

**Change**: New utility in `packages/schemas/src/character/age-category.ts`:
```typescript
export type AgeCategory = 'child' | 'young' | 'adult' | 'mature' | 'elder';

export function deriveAgeCategory(age: number, race: Race): AgeCategory {
  const thresholds = RACE_AGE_THRESHOLDS[race] ?? DEFAULT_AGE_THRESHOLDS;
  // Return appropriate category based on age and race lifespan
}
```

Races like Elf have extended lifespans, so thresholds must be race-aware.

#### 3. Add region semantic tags

**Current state**: Design references `'exposed-skin'`, `'contact-hands'`, etc., but these tags don't exist.

**Change**: New file `packages/schemas/src/body-regions/region-tags.ts`:
```typescript
export const REGION_TAGS = {
  'exposed-skin': ['face', 'neck', 'hands', 'arms', ...],
  'contact-hands': ['hands', 'leftHand', 'rightHand'],
  'breath-adjacent': ['mouth', 'face', 'nose'],
  'intimate': [...],
} as const;
```

This enables fragment and augmentation rules to target groups of regions semantically.

#### 4. Handle polymorphic `physique`

**Current state**: `physique: string | Physique` union requires normalization.

**Change**: Add helper in fragment resolver:
```typescript
function normalizePhysique(physique: string | Physique | undefined): string | undefined {
  if (!physique) return undefined;
  if (typeof physique === 'string') return physique;
  return physique.build ?? physique.appearance?.build;
}
```

### Package Architecture

**Resolution logic location**: Place in `@minimal-rpg/schemas` (not `@minimal-rpg/characters`) to:
- Match existing `resolveRegionScent()` pattern
- Enable web package to import without circular dependencies
- Keep schemas as single source of truth for type-driven resolution

**New files**:
```
packages/schemas/src/character/sensory-profile/
├── index.ts           # Barrel export
├── config.ts          # SensoryProfileConfigSchema
├── types.ts           # Fragment, rule, and context types
├── fragments.ts       # Fragment library (race, age, gender, physique, occupation)
├── augment.ts         # Augmentation rule engine
└── resolver.ts        # resolveSensoryProfile() main entry point
```

### Generator Package Coexistence

**Existing**: `packages/generator/src/character/generate.ts` has `generateBodyMap()` for random procedural NPCs.

**Clarification**: The two systems serve different purposes:
- **Generator**: Random/procedural generation with theme-based value pools (for background NPCs, testing)
- **Sensory Profile System**: Deterministic trait-based defaults (for user-created characters in Character Studio)

No conflict—both can coexist. Document use cases clearly in README files.

---

_This design prioritizes zero-friction defaults while preserving the deep customization that makes the system valuable._
