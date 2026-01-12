# TASK-010: Wire SocialPatternsForm to Signals

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-003

---

## Objective

Connect the SocialPatternsForm component to read/write from character profile signals.

## File to Modify

`packages/web/src/features/character-studio/components/personality/SocialPatternsForm.tsx`

## Signal Path

- Read: `characterProfile.value.personalityMap.social`
- Write: `updatePersonalityMap({ social: { ... } })`

## Expected Fields

```typescript
interface SocialPatterns {
  strangerDefault: 'welcoming' | 'neutral' | 'guarded' | 'hostile';
  conflictStyle: 'confrontational' | 'diplomatic' | 'avoidant' | 'passive-aggressive' | 'collaborative';
  groupRole: 'leader' | 'follower' | 'mediator' | 'outsider';
  intimacyComfort: number; // 0-1, how comfortable with emotional closeness
}
```

## Implementation Pattern

```typescript
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updatePersonalityMap } from '../../signals.js';

export const SocialPatternsForm: React.FC = () => {
  useSignals();

  const social = characterProfile.value.personalityMap?.social ?? {
    strangerDefault: 'neutral',
    conflictStyle: 'diplomatic',
  };

  const handleChange = (field: string, value: unknown) => {
    updatePersonalityMap({
      social: {
        ...social,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label>Default with Strangers</label>
        <select
          value={social.strangerDefault}
          onChange={(e) => handleChange('strangerDefault', e.target.value)}
        >
          <option value="welcoming">Welcoming</option>
          <option value="neutral">Neutral</option>
          <option value="guarded">Guarded</option>
          <option value="hostile">Hostile</option>
        </select>
      </div>
      {/* More fields... */}
    </div>
  );
};
```

## Acceptance Criteria

- [ ] Form displays current social pattern values
- [ ] Select changes update signal immediately
- [ ] All fields work (strangerDefault, conflictStyle, etc.)
- [ ] Values persist when saving character
