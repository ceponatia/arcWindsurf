# @minimal-rpg/generator

Random content generator for Minimal RPG. Generates complete or partial game entities using themed value pools.

## Features

- **Character generation**: Creates fully populated character profiles with coherent attributes
- **Theme-based**: Themes define value pools and biases for different character archetypes
- **Gender-aware**: Automatically filters body regions based on character gender
- **Fill-or-overwrite**: Can fill only empty fields or regenerate everything
- **Complete sensory data**: Generates scent, texture, visual, and flavor data for body regions
- **Rich personality**: Generates Big Five dimensions, values, fears, speech style, and stress responses
- **Extensible**: Designed to support personas, items, settings, locations, and other entities

## Usage

```typescript
import { generateCharacter, THEMES } from '@minimal-rpg/generator';

// Generate a complete character from scratch (modern woman theme)
const character = generateCharacter({
  theme: THEMES['modern-woman'],
});

// Generate a modern man character
const maleCharacter = generateCharacter({
  theme: THEMES['modern-man'],
});

// Fill in missing fields on an existing partial character
const completed = generateCharacter({
  theme: THEMES['modern-woman'],
  existing: {
    name: 'Sarah',
    age: 28,
  },
  mode: 'fill-empty',
});

// Use base theme for gender-neutral random generation
const randomCharacter = generateCharacter({
  theme: THEMES.base,
});
```

## Available Themes

- **base**: Gender-neutral with balanced, random generation across all attributes
- **modern-woman**: Contemporary female characters with realistic personalities
- **modern-man**: Contemporary male characters with realistic personalities

## Structure

```text
src/
├── index.ts              # Public exports
├── types.ts              # Shared generator types
├── shared/               # Shared utilities
│   └── random.ts         # Random selection helpers
├── character/            # Character generation
│   ├── index.ts
│   ├── types.ts          # Character-specific types
│   ├── generate.ts       # Main character generator
│   ├── filters.ts        # Gender/region filtering
│   ├── pools/            # Value pools by category
│   │   ├── index.ts
│   │   ├── names.ts      # First/last name pools
│   │   ├── appearance.ts # Physical appearance pools
│   │   ├── personality.ts # Traits, values, fears pools
│   │   ├── sensory.ts    # Scent, texture, visual, flavor pools
│   │   └── backstory.ts  # Summary/backstory templates
│   └── themes/           # Character themes
│       ├── index.ts
│       ├── base.ts       # Base gender-neutral theme
│       ├── modern-woman.ts
│       └── modern-man.ts
└── [future domains...]   # persona/, item/, setting/, location/
```

## Generated Character Data

The generator creates complete `CharacterProfile` objects including:

### Basics

- `id`, `name`, `age`, `gender`
- `summary`, `backstory`, `personality` (text)
- `tags`

### Physique

- Build: height, torso, skin tone, arms, legs, feet
- Appearance: hair (color, style, length), eyes (color), features

### Body Map (Sensory Data)

For each applicable body region:

- **Scent**: primary note, intensity
- **Texture**: primary feel, temperature, moisture
- **Visual**: description, skin condition, distinguishing features
- **Flavor**: primary taste, intensity (for specific regions)

### Personality Map

- **Dimensions**: Big Five (OCEAN) scores
- **Traits**: Keyword descriptors
- **Values**: Prioritized core values
- **Fears**: Categories with triggers and coping mechanisms
- **Attachment**: Attachment style
- **Emotional baseline**: Current mood and stability
- **Social patterns**: Stranger default, warmth rate, conflict style
- **Speech style**: Vocabulary, formality, humor, directness
- **Stress behavior**: Primary response, threshold, recovery, soothing activities

### Details

- Flexible fact entries with labels, values, areas, and importance

## Themes

A theme defines:

- Value pools for each attribute (or inherits from base)
- Weight biases for certain values
- Default values (e.g., gender for "modern-woman" theme)
- Region inclusions/exclusions
- Dimension biases (e.g., personality dimension score ranges)

Themes can extend other themes to create variations.

## Adding New Domains

To add generation for a new entity type (e.g., items):

1. Create `src/item/` directory structure
2. Define pools in `src/item/pools/`
3. Define themes in `src/item/themes/`
4. Create `src/item/generate.ts` with the main generator
5. Export from `src/index.ts`
