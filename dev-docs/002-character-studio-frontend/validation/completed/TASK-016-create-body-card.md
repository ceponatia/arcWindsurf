# TASK-016: Create BodyCard Component

**Priority**: P1
**Estimate**: 2 hours
**Phase**: 3 - Body & Appearance
**Depends On**: TASK-003

---

## Objective

Create a simplified body region editing card for Character Studio 1.0.

## File to Create

`packages/web/src/features/character-studio/components/BodyCard.tsx`

## Design (Simplified for 1.0)

Instead of an interactive body map, use a form-based approach with key regions.

### Regions

| Region | Fields |
|--------|--------|
| Hair | Color, style, length (text or selects) |
| Face | Description (textarea) |
| Torso | Build, notable features (text) |
| Hands | Description, calluses/scars (text) |

### Layout

```tsx
<IdentityCard title="Body & Appearance" defaultOpen={false}>
  <div className="space-y-4">
    <div>
      <h4 className="font-medium">Hair</h4>
      <input
        placeholder="Color, style, length..."
        value={body?.hair ?? ''}
        onChange={(e) => updateBody('hair', e.target.value)}
      />
    </div>

    <div>
      <h4 className="font-medium">Face</h4>
      <textarea
        placeholder="Describe facial features..."
        value={body?.face ?? ''}
        onChange={(e) => updateBody('face', e.target.value)}
      />
    </div>

    {/* More regions... */}
  </div>
</IdentityCard>
```

## Signal Path

- Read: `characterProfile.value.body`
- Write: `updateProfile('body', { ... })`

Or if body is in personalityMap:

- Read: `characterProfile.value.personalityMap.body`
- Write: `updatePersonalityMap({ body: { ... } })`

Check schema for correct location.

## Implementation

```typescript
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updateProfile } from '../signals.js';
import { IdentityCard } from './IdentityCard.js';

interface BodyRegions {
  hair?: string;
  face?: string;
  torso?: string;
  hands?: string;
}

export const BodyCard: React.FC = () => {
  useSignals();

  const body: BodyRegions = characterProfile.value.body ?? {};

  const updateBody = (field: keyof BodyRegions, value: string) => {
    updateProfile('body', { ...body, [field]: value });
  };

  return (
    <IdentityCard title="Body & Appearance" defaultOpen={false}>
      {/* form fields */}
    </IdentityCard>
  );
};
```

## Acceptance Criteria

- [x] BodyCard component renders
- [x] All four regions have input fields
- [x] Changes update the signal
- [x] Values persist when saving character
- [x] Integrates with IdentityCard wrapper
