# TASK-017: Create AppearanceCard Component

**Priority**: P1
**Estimate**: 1 hour
**Phase**: 3 - Body & Appearance
**Depends On**: TASK-003

---

## Objective

Create an appearance/physique editing card for overall physical characteristics.

## File to Create

`packages/web/src/features/character-studio/components/AppearanceCard.tsx`

## Fields

| Field | Type | Options/Format |
|-------|------|----------------|
| Height | text or select | "5'10\"" or "Tall/Average/Short" |
| Build | select | Slight, Lean, Average, Athletic, Muscular, Heavy |
| Age Appearance | text | "Looks older than actual age" |
| Notable Features | textarea | Scars, tattoos, distinctive marks |
| Overall Impression | textarea | First impression others have |

## Implementation

```typescript
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updateProfile } from '../signals.js';
import { IdentityCard } from './IdentityCard.js';

interface Physique {
  height?: string;
  build?: string;
  ageAppearance?: string;
  notableFeatures?: string;
  impression?: string;
}

export const AppearanceCard: React.FC = () => {
  useSignals();

  const physique: Physique = characterProfile.value.physique ?? {};

  const updatePhysique = (field: keyof Physique, value: string) => {
    updateProfile('physique', { ...physique, [field]: value });
  };

  return (
    <IdentityCard title="Physical Appearance" defaultOpen={false}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Height</label>
            <input
              className="w-full border rounded p-2"
              placeholder="e.g., 5'10\" or Tall"
              value={physique.height ?? ''}
              onChange={(e) => updatePhysique('height', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Build</label>
            <select
              className="w-full border rounded p-2"
              value={physique.build ?? 'average'}
              onChange={(e) => updatePhysique('build', e.target.value)}
            >
              <option value="slight">Slight</option>
              <option value="lean">Lean</option>
              <option value="average">Average</option>
              <option value="athletic">Athletic</option>
              <option value="muscular">Muscular</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Notable Features</label>
          <textarea
            className="w-full border rounded p-2"
            placeholder="Scars, tattoos, distinctive marks..."
            value={physique.notableFeatures ?? ''}
            onChange={(e) => updatePhysique('notableFeatures', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Overall Impression</label>
          <textarea
            className="w-full border rounded p-2"
            placeholder="First impression others have..."
            value={physique.impression ?? ''}
            onChange={(e) => updatePhysique('impression', e.target.value)}
          />
        </div>
      </div>
    </IdentityCard>
  );
};
```

## Signal Path

- Read: `characterProfile.value.physique`
- Write: `updateProfile('physique', { ... })`

## Acceptance Criteria

- [x] AppearanceCard component renders
- [x] Height and Build fields work
- [x] Notable Features textarea works
- [x] Overall Impression textarea works
- [x] Values persist when saving character
