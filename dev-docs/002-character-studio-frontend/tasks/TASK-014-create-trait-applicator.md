# TASK-014: Create Trait Applicator Utility

**Priority**: P0
**Estimate**: 1 hour
**Phase**: 2 - Trait Application
**Depends On**: TASK-013

---

## Objective

Create a utility that applies inferred traits to the character profile based on their dot-notation path.

## File to Create

`packages/web/src/features/character-studio/utils/trait-applicator.ts`

## Input Format

Traits come from the `/studio/infer-traits` endpoint:

```typescript
interface InferredTrait {
  path: string;        // e.g., "personalityMap.dimensions.openness"
  value: unknown;      // e.g., 0.8 or "guarded"
  confidence: number;  // 0-1
  source: string;      // Quote from conversation
}
```

## Implementation

```typescript
import { characterProfile, updatePersonalityMap, updateProfile } from '../signals.js';
import type { CharacterProfile, PersonalityMap } from '@minimal-rpg/schemas';

export function applyTrait(trait: { path: string; value: unknown }): void {
  const pathParts = trait.path.split('.');

  if (pathParts[0] === 'personalityMap') {
    applyPersonalityTrait(pathParts.slice(1), trait.value);
  } else {
    // Top-level profile field (name, backstory, etc.)
    updateProfile(pathParts[0] as keyof CharacterProfile, trait.value as never);
  }
}

function applyPersonalityTrait(path: string[], value: unknown): void {
  const current = characterProfile.value.personalityMap ?? {};

  if (path.length === 1) {
    // Direct field: personalityMap.attachment
    updatePersonalityMap({ [path[0]]: value });
  } else if (path.length === 2) {
    // Nested field: personalityMap.dimensions.openness
    const [section, field] = path;
    const sectionData = (current as Record<string, unknown>)[section] ?? {};
    updatePersonalityMap({
      [section]: { ...(sectionData as object), [field]: value },
    });
  } else if (path[0] === 'values' || path[0] === 'fears') {
    // Array field: append to existing array
    const existing = (current as Record<string, unknown[]>)[path[0]] ?? [];
    updatePersonalityMap({
      [path[0]]: [...existing, value],
    });
  }
}
```

## Paths to Support

| Path Pattern | Example | Action |
|--------------|---------|--------|
| `personalityMap.dimensions.<dim>` | `personalityMap.dimensions.openness` | Update nested object |
| `personalityMap.social.<field>` | `personalityMap.social.strangerDefault` | Update nested object |
| `personalityMap.speech.<field>` | `personalityMap.speech.vocabulary` | Update nested object |
| `personalityMap.stress.<field>` | `personalityMap.stress.primary` | Update nested object |
| `personalityMap.values` | Array append | Append to array |
| `personalityMap.fears` | Array append | Append to array |
| `backstory` | Direct profile field | Update profile |

## Acceptance Criteria

- [ ] Function exists and is exported
- [ ] Handles nested personalityMap paths
- [ ] Handles top-level profile paths
- [ ] Handles array appends for values/fears
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass (if added)
