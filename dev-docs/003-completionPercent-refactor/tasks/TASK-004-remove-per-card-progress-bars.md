# TASK-004: Remove Per-Card Progress Bars from IdentityPanel

**Priority**: P1
**Estimate**: 30 minutes
**Phase**: 3 - UI Cleanup
**Depends On**: TASK-003

---

## Objective

Remove the `completionPercent` prop from all `IdentityCard` instances in `IdentityPanel.tsx` and remove the associated completion calculation helper functions.

## File to Modify

`packages/web/src/features/character-studio/components/IdentityPanel.tsx`

## Changes Required

### 1. Remove Helper Functions

Delete these functions:

- `getCoreCompletion()`
- `getBackstoryCompletion()`
- `getClassificationCompletion()`
- `getPersonalityCompletion()`

### 2. Remove completionPercent Props

Remove `completionPercent={...}` from all `IdentityCard` instances:

```tsx
// Before
<IdentityCard
  title="Core Identity"
  defaultOpen={true}
  completionPercent={getCoreCompletion()}
  hasContent={completion.name}
>

// After
<IdentityCard
  title="Core Identity"
  defaultOpen={true}
  hasContent={completion.name}
>
```

### 3. Keep hasContent Props

The `hasContent` prop should remain for green checkmark indicators on collapsed cards.

## Cards to Update

1. Core Identity
2. Backstory
3. Classification
4. Personality Dimensions
5. Emotional Baseline
6. Values & Motivations
7. Fears & Triggers
8. Social Patterns
9. Voice & Communication
10. Stress Response

## Also Update

- `AppearanceCard.tsx` - Remove internal `calculateCompletion()` function
- `BodyCard.tsx` - Remove internal completion calculation if present

## Acceptance Criteria

- [x] No `completionPercent` props on any `IdentityCard`
- [x] No per-card progress bars visible in UI
- [x] Green checkmarks still appear on collapsed cards with content
- [x] Helper completion functions removed from IdentityPanel
- [x] AppearanceCard completion function removed
- [x] No TypeScript errors
- [x] UI looks clean without progress bars
