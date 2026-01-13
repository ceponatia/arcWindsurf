# TASK-003: Refactor Completion Signals for Required Fields Only

**Priority**: P0
**Estimate**: 45 minutes
**Phase**: 2 - Completion Logic
**Depends On**: TASK-001, TASK-002

---

## Objective

Refactor the `sectionCompletion` and `completionScore` computed signals to track only the 6 required fields instead of all personality sections.

## File to Modify

`packages/web/src/features/character-studio/signals.ts`

## Current Implementation

```typescript
export const sectionCompletion = computed(() => {
  const p = characterProfile.value;
  const pm = p.personalityMap;

  return {
    name: !!p.name?.trim(),
    backstory: !!p.backstory?.trim(),
    dimensions: !!(pm?.dimensions && Object.keys(pm.dimensions).length > 0),
    values: !!(pm?.values && pm.values.length > 0),
    // ... many more sections
  };
});
```

## Target Implementation

```typescript
export const REQUIRED_FIELDS = ['name', 'age', 'gender', 'summary', 'backstory', 'race'] as const;
export type RequiredField = typeof REQUIRED_FIELDS[number];

export const requiredFieldsCompletion = computed(() => {
  const p = characterProfile.value;

  return {
    name: !!p.name?.trim(),
    age: typeof p.age === 'number' && p.age > 0,
    gender: !!p.gender && p.gender !== '',
    summary: !!p.summary?.trim(),
    backstory: !!p.backstory?.trim(),
    race: !!p.race && p.race !== '',
  };
});

export const completionScore = computed(() => {
  const completion = requiredFieldsCompletion.value;
  const items = Object.values(completion);
  const completedCount = items.filter(Boolean).length;

  return Math.round((completedCount / REQUIRED_FIELDS.length) * 100);
});
```

## Migration Notes

1. Keep `sectionCompletion` if used elsewhere for `hasContent` checks
2. Or rename to `cardContentStatus` for clarity
3. `completionScore` should now only count required fields

## Acceptance Criteria

- [ ] `REQUIRED_FIELDS` constant exported from signals
- [ ] `requiredFieldsCompletion` tracks only 6 required fields
- [ ] `completionScore` calculates percentage from 6 fields only
- [ ] Empty strings and "Select..." values count as incomplete
- [ ] 0% when no required fields filled
- [ ] 100% when all 6 required fields filled
- [ ] Partial completion shows correct percentage (e.g., 3/6 = 50%)
