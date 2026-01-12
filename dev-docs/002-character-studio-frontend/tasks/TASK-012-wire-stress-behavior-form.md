# TASK-012: Wire StressBehaviorForm to Signals

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-003

---

## Objective

Connect the StressBehaviorForm component to read/write from character profile signals.

## File to Modify

`packages/web/src/features/character-studio/components/personality/StressBehaviorForm.tsx`

## Signal Path

- Read: `characterProfile.value.personalityMap.stress`
- Write: `updatePersonalityMap({ stress: { ... } })`

## Expected Fields

```typescript
interface StressBehavior {
  primary: 'fight' | 'flight' | 'freeze' | 'fawn';
  threshold: number;  // 0-1, how much stress before response triggers
  tells: string[];    // Observable signs of stress
  copingMechanisms?: string[]; // How they deal with stress
}
```

## Implementation Pattern

```typescript
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updatePersonalityMap } from '../../signals.js';

export const StressBehaviorForm: React.FC = () => {
  useSignals();

  const stress = characterProfile.value.personalityMap?.stress ?? {
    primary: 'flight',
    threshold: 0.5,
    tells: [],
  };

  const handleChange = (field: string, value: unknown) => {
    updatePersonalityMap({
      stress: {
        ...stress,
        [field]: value,
      },
    });
  };

  // ... render form with primary response select, threshold slider, tells list
};
```

## Fields to Implement

- [ ] Primary stress response (select: fight/flight/freeze/fawn)
- [ ] Threshold slider (0-1)
- [ ] Tells list (add/remove string items)
- [ ] Coping mechanisms list (optional)

## Acceptance Criteria

- [ ] Form displays current stress behavior values
- [ ] Primary response select works
- [ ] Threshold slider updates signal
- [ ] Tells list allows add/remove
- [ ] Values persist when saving character
