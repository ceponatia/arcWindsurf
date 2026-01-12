# TASK-009: Wire FearsList to Signals

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-003

---

## Objective

Connect the FearsList component to read/write from character profile signals.

## File to Modify

`packages/web/src/features/character-studio/components/personality/FearsList.tsx`

## Signal Path

- Read: `characterProfile.value.personalityMap.fears`
- Write: `updatePersonalityMap({ fears: [...] })`

## Expected Data Structure

```typescript
interface Fear {
  category: string;    // e.g., "physical", "social", "existential"
  specific: string;    // e.g., "heights", "abandonment", "failure"
  intensity: number;   // 0-1 scale
}

// Array of fears
fears: Fear[]
```

## Implementation Pattern

Same pattern as TASK-008 (ValuesList):

```typescript
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updatePersonalityMap } from '../../signals.js';

export const FearsList: React.FC = () => {
  useSignals();

  const fears = characterProfile.value.personalityMap?.fears ?? [];

  const addFear = (newFear: Fear) => {
    updatePersonalityMap({
      fears: [...fears, newFear],
    });
  };

  const removeFear = (index: number) => {
    updatePersonalityMap({
      fears: fears.filter((_, i) => i !== index),
    });
  };

  // ... render list with add/remove/edit
};
```

## Features to Support

- [ ] Display existing fears
- [ ] Add new fear with category, specific, intensity
- [ ] Remove fear
- [ ] Edit fear fields

## Acceptance Criteria

- [ ] List displays current fears
- [ ] Add creates new fear entry
- [ ] Remove deletes fear
- [ ] Field changes update signal
- [ ] Fears persist when saving character
