# TASK-015: Wire acceptTrait Action to Trait Applicator

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 2 - Trait Application
**Depends On**: TASK-014

---

## Objective

Update the `acceptTrait` signal action to actually apply the trait to the character profile using the trait applicator.

## File to Modify

`packages/web/src/features/character-studio/signals.ts`

## Current State

The `acceptTrait` function likely exists but only updates the trait status without applying the value.

## Implementation

```typescript
import { applyTrait } from './utils/trait-applicator.js';

export function acceptTrait(traitPath: string): void {
  const trait = pendingTraits.value.find(t => t.path === traitPath);
  if (!trait) return;

  // Apply the trait value to the profile
  applyTrait(trait);

  // Update trait status to 'accepted'
  pendingTraits.value = pendingTraits.value.map(t =>
    t.path === traitPath ? { ...t, status: 'accepted' as const } : t
  );
}
```

## Verify Signal Structure

Check that `pendingTraits` signal has the expected structure:

```typescript
interface InferredTrait {
  path: string;
  value: unknown;
  confidence: number;
  source: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

const pendingTraits = signal<InferredTrait[]>([]);
```

## Test Flow

1. Have a conversation that produces trait suggestions
2. Click "Accept" on a suggested trait
3. Verify the corresponding form field updates
4. Verify the trait moves from pending to accepted

## Acceptance Criteria

- [x] Clicking accept applies trait value to profile
- [x] Form field updates visually after acceptance
- [x] Trait status changes to 'accepted'
- [x] No errors in console
- [x] Changes persist when saving character
