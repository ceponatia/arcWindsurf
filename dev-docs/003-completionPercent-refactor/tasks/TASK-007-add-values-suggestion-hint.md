# TASK-007: Add Values Suggestion Hint

**Priority**: P3
**Estimate**: 20 minutes
**Phase**: 4 - Polish
**Depends On**: TASK-004

---

## Objective

Add a subtle hint in the Values & Motivations card suggesting users add at least one core value, without making it a required field.

## File to Modify

`packages/web/src/features/character-studio/components/personality/ValuesList.tsx`

## Implementation

Add a hint when the values list is empty:

```tsx
{values.length === 0 && (
  <div className="text-xs text-slate-500 italic py-2">
    💡 Adding at least one core value helps define your character's motivations
  </div>
)}
```

## Alternative: Card-Level Hint

Could also add to the `IdentityCard` for Values & Motivations in `IdentityPanel.tsx`:

```tsx
<IdentityCard
  title="Values & Motivations"
  defaultOpen={false}
  hasContent={completion.values}
  hint={!completion.values ? "Recommended: Add at least one value" : undefined}
>
```

This would require adding a `hint` prop to `IdentityCard`.

## Design Considerations

- Keep hint subtle (text-slate-500, text-xs)
- Don't use error styling (no red)
- Disappears once a value is added
- Optional emoji for friendliness

## Acceptance Criteria

- [x] Hint displays when no values exist
- [x] Hint disappears after adding first value
- [x] Hint is subtle, not blocking
- [x] Does not affect completion percentage
- [x] Does not block save
- [x] Styling consistent with other hints/help text
