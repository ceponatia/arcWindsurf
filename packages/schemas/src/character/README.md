# Character Schemas

Zod schemas for character profiles, appearance, personality, and body region data.

## Files

| File                  | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `characterProfile.ts` | Main `CharacterProfileSchema` composite type                           |
| `basics.ts`           | Core identity fields (id, name, age, gender, summary, backstory, tags) |
| `appearance.ts`       | Physical description via `PhysiqueSchema` (build + appearance)         |
| `body.ts`             | Body region taxonomy with per-region sensory data (`BodyMapSchema`)    |
| `scent.ts`            | Legacy flat scent schema (deprecated, use `body` instead)              |
| `details.ts`          | Flexible key-value details for RAG experiments                         |
| `personality.ts`      | Structured personality map (Big Five, emotions, speech style)          |

**Note:** Body sensory data parsing utilities (e.g., `parseBodyEntries`, `formatScent`) have been moved to `@minimal-rpg/utils` to keep this package focused on schemas only.

## CharacterProfile

The main export combining all character facets:

```ts
CharacterProfileSchema = CharacterBasicsSchema.extend({
  personality: string | string[],      // Simple personality description
  physique: string | PhysiqueSchema,   // Physical appearance
  scent: ScentSchema,                  // Legacy (deprecated)
  body: BodyMapSchema,                 // Per-region sensory data
  personalityMap: PersonalityMapSchema, // Structured personality for NPCs
  details: CharacterDetailSchema[],    // Flexible facts
});
```

## Body Region System

Canonical body regions with 70+ natural language aliases:

```text
head, face, hair, neck, shoulders, torso, chest, back, arms, hands, waist, hips, legs, feet
```

Each region can have:

- `visual` — How it looks
- `scent` — How it smells
- `texture` — How it feels to touch

## Personality Map

Structured personality for NPC agent prompting:

- Big Five dimensions (openness, conscientiousness, extraversion, agreeableness, neuroticism)
- Emotional baseline and values
- Social patterns and speech style
- Stress responses
