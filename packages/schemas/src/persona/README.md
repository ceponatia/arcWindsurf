# Persona Schemas

This directory contains Zod schemas for **persona profiles** - player character definitions used in game sessions.

## Overview

A persona represents the player's character in the game world. Unlike NPCs (which use `CharacterProfile`), personas:

- **Do not include personality fields** - the player controls their own behavior
- **Focus on identity and appearance** - name, summary, physical description
- **Reuse body/appearance systems** - leverage existing character schema components
- **Are session-scoped** - created/selected at session start

## Schema Structure

### PersonaBasics (`basics.ts`)

Core identification fields:

- `id` - Unique identifier
- `name` - Display name (required, max 120 chars)
- `age` - Optional integer
- `summary` - Brief description (required, max 500 chars)

### PersonaAppearance (`appearance.ts`)

Physical description, can be:

- **Free-text string** - Simple appearance description
- **Structured `Physique` object** - Detailed build/appearance data (reuses `character/appearance.ts`)

### PersonaProfile (`personaProfile.ts`)

Main composite schema combining:

- `PersonaBasics` (required)
- `appearance` (optional) - Physical description
- `body` (optional) - Per-region sensory data via `BodyMap`

## Usage Example

```typescript
import { PersonaProfileSchema, type PersonaProfile } from '@minimal-rpg/schemas';

// Minimal persona
const minimalPersona: PersonaProfile = {
  id: 'player-001',
  name: 'Alex',
  summary: 'A curious adventurer exploring the realm',
};

// Detailed persona with appearance
const detailedPersona: PersonaProfile = {
  id: 'player-002',
  name: 'Morgan',
  age: 28,
  summary: 'A seasoned warrior with a mysterious past',
  appearance: {
    build: {
      height: 'tall',
      torso: 'athletic',
      skinTone: 'tan',
      arms: { build: 'muscular', length: 'average' },
      legs: { build: 'toned', length: 'long' },
      feet: { size: 'large', shape: 'average' },
    },
    appearance: {
      hair: { color: 'black', style: 'short', length: 'short' },
      eyes: { color: 'green' },
      features: ['Scar across left cheek', 'Strong jawline'],
    },
  },
  body: {
    face: {
      visual: { description: 'Weathered features, intense gaze' },
    },
    hands: {
      texture: { primary: 'calloused', temperature: 'warm' },
      visual: { description: 'Strong, scarred hands from years of combat' },
    },
  },
};

// Validate at runtime
const validated = PersonaProfileSchema.parse(detailedPersona);
```

## Integration Points

1. **Persona Builder UI** (`packages/web`) - Form for creating/editing personas
2. **Session API** (`packages/api/src/sessions`) - Load persona at session start
3. **Context Injection** - Include persona in LLM prompts for consistent character representation
4. **State Manager** - Store active persona in session state

## Related Schemas

- `character/*` - NPC character schemas (includes personality, backstory)
- `setting/*` - Game world/setting schemas
- `location/*` - Location/building schemas

## Design Principles

- **Simplicity** - Only essential fields for player representation
- **Flexibility** - Support both simple and detailed persona creation
- **Reusability** - Leverage existing appearance/body systems
- **Type Safety** - Strong typing via Zod with runtime validation
