# TASK-006: Wire BigFiveSliders to Signals

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-003

---

## Objective

Connect the existing BigFiveSliders component to read/write from the character profile signals.

## File to Modify

`packages/web/src/features/character-studio/components/personality/BigFiveSliders.tsx`

## Current State

The component likely exists but may use local state or props instead of signals.

## Implementation

### Import Signals

```typescript
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updatePersonalityMap } from '../../signals.js';
```

### Read Values

```typescript
const dimensions = characterProfile.value.personalityMap?.dimensions ?? {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
};
```

### Write Values

```typescript
const handleChange = (dimension: string, value: number) => {
  updatePersonalityMap({
    dimensions: {
      ...characterProfile.value.personalityMap?.dimensions,
      [dimension]: value,
    },
  });
};
```

### Render Pattern

```tsx
<input
  type="range"
  min={0}
  max={1}
  step={0.1}
  value={dimensions.openness}
  onChange={(e) => handleChange('openness', parseFloat(e.target.value))}
/>
```

## Signal Path

- Read: `characterProfile.value.personalityMap.dimensions`
- Write: `updatePersonalityMap({ dimensions: { ... } })`

## Acceptance Criteria

- [ ] Sliders display current dimension values
- [ ] Moving slider updates signal immediately
- [ ] All five dimensions work (O, C, E, A, N)
- [ ] Values persist when saving character
- [ ] Component uses `useSignals()` for reactivity
