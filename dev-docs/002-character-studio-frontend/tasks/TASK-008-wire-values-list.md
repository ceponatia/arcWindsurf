# TASK-008: Wire ValuesList to Signals

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-003

---

## Objective

Connect the ValuesList component to read/write from character profile signals.

## File to Modify

`packages/web/src/features/character-studio/components/personality/ValuesList.tsx`

## Signal Path

- Read: `characterProfile.value.personalityMap.values`
- Write: `updatePersonalityMap({ values: [...] })`

## Expected Data Structure

```typescript
interface Value {
  value: string;      // e.g., "honor", "family", "knowledge"
  priority: number;   // 1-5 or similar scale
}

// Array of values
values: Value[]
```

## Implementation Pattern

```typescript
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updatePersonalityMap } from '../../signals.js';

export const ValuesList: React.FC = () => {
  useSignals();

  const values = characterProfile.value.personalityMap?.values ?? [];

  const addValue = (newValue: Value) => {
    updatePersonalityMap({
      values: [...values, newValue],
    });
  };

  const removeValue = (index: number) => {
    updatePersonalityMap({
      values: values.filter((_, i) => i !== index),
    });
  };

  const updateValue = (index: number, updated: Value) => {
    const newValues = [...values];
    newValues[index] = updated;
    updatePersonalityMap({ values: newValues });
  };

  // ... render list with add/remove/edit
};
```

## Features to Support

- [ ] Display existing values
- [ ] Add new value
- [ ] Remove value
- [ ] Edit value priority
- [ ] Reorder values (optional for v1)

## Acceptance Criteria

- [ ] List displays current values
- [ ] Add button creates new value entry
- [ ] Remove button deletes value
- [ ] Priority changes update signal
- [ ] Values persist when saving character
