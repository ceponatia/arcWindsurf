# TASK-004: Add Backstory Card to IdentityPanel

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-003

---

## Objective

Add a backstory editing card to the IdentityPanel using the new IdentityCard wrapper.

## File to Modify

`packages/web/src/features/character-studio/components/IdentityPanel.tsx`

## Implementation

### Add Card

```tsx
import { IdentityCard } from './IdentityCard.js';
import { characterProfile, updateProfile } from '../signals.js';

// Inside IdentityPanel component:
<IdentityCard title="Backstory" defaultOpen={false}>
  <textarea
    className="w-full min-h-32 p-2 border rounded"
    placeholder="Describe the character's history and background..."
    value={characterProfile.value.backstory ?? ''}
    onChange={(e) => updateProfile('backstory', e.target.value)}
  />
</IdentityCard>
```

### Signal Wiring

- Read from `characterProfile.value.backstory`
- Write via `updateProfile('backstory', value)`
- Use `useSignals()` for reactivity

## Acceptance Criteria

- [ ] Backstory card appears in IdentityPanel
- [ ] Textarea displays current backstory value
- [ ] Typing updates the signal
- [ ] Changes persist when saving character
- [ ] Card collapses/expands correctly

---

## Completion Log (2026-01-12)

- Added the "Backstory" card to `IdentityPanel.tsx` using the `IdentityCard` wrapper.
- Wired the textarea to `characterProfile.value.backstory`.
