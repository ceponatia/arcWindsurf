# TASK-011: Wire SpeechStyleForm to Signals

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-003

---

## Objective

Connect the SpeechStyleForm component to read/write from character profile signals.

## File to Modify

`packages/web/src/features/character-studio/components/personality/SpeechStyleForm.tsx`

## Signal Path

- Read: `characterProfile.value.personalityMap.speech`
- Write: `updatePersonalityMap({ speech: { ... } })`

## Expected Fields

```typescript
interface SpeechStyle {
  vocabulary: 'simple' | 'average' | 'educated' | 'erudite' | 'archaic';
  directness: 'blunt' | 'direct' | 'tactful' | 'indirect' | 'evasive';
  formality: 'casual' | 'neutral' | 'formal' | 'ceremonial';
  verbosity: 'terse' | 'concise' | 'average' | 'verbose' | 'rambling';
  quirks?: string; // Optional freeform field for speech quirks
}
```

## Implementation Pattern

```typescript
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updatePersonalityMap } from '../../signals.js';

export const SpeechStyleForm: React.FC = () => {
  useSignals();

  const speech = characterProfile.value.personalityMap?.speech ?? {
    vocabulary: 'average',
    directness: 'direct',
    formality: 'neutral',
    verbosity: 'average',
  };

  const handleChange = (field: string, value: unknown) => {
    updatePersonalityMap({
      speech: {
        ...speech,
        [field]: value,
      },
    });
  };

  // ... render selects for each field
};
```

## Acceptance Criteria

- [ ] Form displays current speech style values
- [ ] Select changes update signal immediately
- [ ] All fields work (vocabulary, directness, etc.)
- [ ] Optional quirks field works (if present)
- [ ] Values persist when saving character
