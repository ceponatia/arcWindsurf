# TASK-002: Update Save Validation for New Required Fields

**Priority**: P0
**Estimate**: 30 minutes
**Phase**: 1 - Schema Changes
**Depends On**: TASK-001

---

## Objective

Update the `validateCharacterProfileBeforeSave` function to validate all 6 required fields: name, age, gender, summary, backstory, and race.

## File to Modify

`packages/web/src/features/character-studio/validation/validateCharacterProfileBeforeSave.ts`

## Current Validation

Currently validates:

- `name` - required string
- `summary` - required string
- `backstory` - required string

## Target Validation

Add validation for:

- `age` - required positive integer
- `gender` - required, must not be empty or "Select..."
- `race` - required, must not be empty or "Select..."

## Implementation Notes

```typescript
// Age validation
if (!profile.age || profile.age <= 0) {
  errors.age = 'Age is required';
}

// Gender validation
if (!profile.gender || profile.gender === '') {
  errors.gender = 'Gender is required';
}

// Race validation
if (!profile.race || profile.race === '') {
  errors.race = 'Race is required';
}
```

## Files to Update

1. `validation/validateCharacterProfileBeforeSave.ts` - Add new validations
2. `validation/types.ts` - Add `age`, `gender`, `race` to `StudioFieldKey` type

## Acceptance Criteria

- [x] Validation fails if `age` is missing or <= 0
- [x] Validation fails if `gender` is empty or unselected
- [x] Validation fails if `race` is empty or unselected
- [x] Error messages display inline for each field
- [x] Global "Please fix validation errors" appears when any required field missing
- [x] Existing name/summary/backstory validations still work
