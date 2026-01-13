# TASK-007: Wire EmotionalBaselineForm to Signals

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-003

---

## Objective

Connect the EmotionalBaselineForm component to read/write from character profile signals.

## File to Modify

`packages/web/src/features/character-studio/components/personality/EmotionalBaselineForm.tsx`

## Signal Path

- Read: `characterProfile.value.personalityMap.emotionalBaseline`
- Write: `updatePersonalityMap({ emotionalBaseline: { ... } })`

## Expected Fields

Emotional baseline typically includes:

- Primary emotion (e.g., content, anxious, melancholic)
- Intensity (0-1 scale)
- Stability (how quickly emotions shift)

Check the actual component for specific field names.

## Implementation Pattern

```typescript
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updatePersonalityMap } from '../../signals.js';

export const EmotionalBaselineForm: React.FC = () => {
  useSignals();

  const baseline = characterProfile.value.personalityMap?.emotionalBaseline ?? {
    primary: 'neutral',
    intensity: 0.5,
  };

  const handleChange = (field: string, value: unknown) => {
    updatePersonalityMap({
      emotionalBaseline: {
        ...baseline,
        [field]: value,
      },
    });
  };

  // ... render form fields
};
```

## Acceptance Criteria

- [x] Form displays current emotional baseline values
- [x] Changes update signal immediately
- [x] Values persist when saving character
- [x] Component uses `useSignals()` for reactivity

## Notes

- Form will 400 if Summary is empty because schema requires it. Consider adding default text or validation.
