# TASK-006: Fix Age Input (Remove Spinner Arrows)

**Priority**: P2
**Estimate**: 15 minutes
**Phase**: 3 - UI Cleanup
**Depends On**: None

---

## Objective

Remove the up/down spinner arrows from the age input field since users will manually type the age value.

## File to Modify

`packages/web/src/features/character-studio/components/IdentityPanel.tsx`

## Current Implementation

```tsx
<input
  type="number"
  value={profile.age ?? ''}
  onChange={(e) => updateProfile('age', parseInt(e.target.value))}
  className="..."
/>
```

## Target Implementation

### Option A: CSS Hide Spinners

```tsx
<input
  type="number"
  inputMode="numeric"
  value={profile.age ?? ''}
  onChange={(e) => updateProfile('age', parseInt(e.target.value))}
  className="... [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
/>
```

### Option B: Use Text Input with Numeric Validation

```tsx
<input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  value={profile.age ?? ''}
  onChange={(e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      updateProfile('age', val);
    } else if (e.target.value === '') {
      updateProfile('age', undefined);
    }
  }}
  className="..."
/>
```

## Recommendation

Use **Option A** (CSS approach) to maintain native number input behavior (min/max validation) while hiding the visual spinners.

## Acceptance Criteria

- [x] Age input has no visible up/down arrows
- [x] Users can type age directly
- [x] Only numeric input accepted
- [x] Empty value handled gracefully
- [x] Works in Chrome, Firefox, Safari
- [x] Mobile numeric keyboard appears (inputMode="numeric")
