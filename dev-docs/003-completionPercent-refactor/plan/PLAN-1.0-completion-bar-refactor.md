# Completion Bar Refactor Plan

## Overview

Refactor the Character Studio completion tracking from per-card progress bars to a single overall completion indicator based on **required fields only**.

## Problem Statement

### Current Behavior

- Each `IdentityCard` has an optional `completionPercent` prop displaying a per-card progress bar
- Progress bars show 0% even when components display pre-filled default values (e.g., dropdowns with `CORE_EMOTIONS[7]`)
- This happens because defaults are rendered locally in components but not stored in `characterProfile` signal until user interaction
- Big Five sliders always have a value (50% default) - they can never be "empty"

### Issues

1. **Misleading UX**: User sees filled dropdowns but 0% progress
2. **Semantic confusion**: What does "0%" mean for pre-filled fields?
3. **Visual clutter**: 11+ progress bars create cognitive overhead
4. **Inconsistency**: Big Five is inherently always "complete" since sliders = values

## Proposed Solution (Option 4)

Remove per-card progress bars entirely. Replace with a single overall completion indicator in `StudioHeader` that tracks **required/intentional fields only**.

### What "Completion" Should Track

| Category | Fields | Rationale |
|----------|--------|-----------|
| **Required** | name, summary, backstory | Must be filled for valid character |
| **User-added lists** | values (count > 0), fears (count > 0) | Requires intentional action |
| **User-written content** | body descriptions, appearance notes | Free-text = intentional input |

### What to Exclude

| Field Type | Example | Rationale |
|------------|---------|-----------|
| **Always-valued sliders** | Big Five dimensions | 50% is a valid value; can't be empty |
| **Pre-filled dropdowns** | Emotional baseline, social patterns | Defaults are meaningful; no action needed |

## Implementation Steps

### Phase 1: Define Required Fields Schema

1. Create `requiredFields` configuration in signals or a new config file
2. Define which fields are truly required vs optional
3. Add field metadata (required, optional, has-default)

### Phase 2: Update Completion Logic

1. Refactor `sectionCompletion` computed signal to track only required fields
2. Update `completionScore` to calculate based on required fields
3. Consider weighted scoring (e.g., backstory worth more than name)

### Phase 3: Remove Per-Card Progress Bars

1. Remove `completionPercent` prop from all `IdentityCard` instances in `IdentityPanel.tsx`
2. Remove completion calculation helpers (`getCoreCompletion`, `getBackstoryCompletion`, etc.)
3. Keep `hasContent` prop for the green checkmark indicator

### Phase 4: Enhance Header Indicator

1. Update `StudioHeader` to prominently display overall completion
2. Consider adding a breakdown tooltip showing which required fields are missing
3. Style the indicator to be clear and actionable

## Decisions

### Required Fields for Completion (6 total)

| Field | Schema Status | Decision |
|-------|---------------|----------|
| `name` | Required (`z.string().min(1)`) | **Required** |
| `age` | Optional in schema | **Required** - Important for character context |
| `gender` | Optional in schema | **Required** - User must select (not "Select...") |
| `summary` | Required (`z.string().min(1)`) | **Required** |
| `backstory` | Required (`z.string().min(1)`) | **Required** - Provides narrative context to LLM |
| `race` | Optional in schema | **Required** - Schema change needed to match gender |

### Excluded from Completion (have meaningful defaults)

| Section | Reason |
|---------|--------|
| Big Five dimensions | Sliders always have value; 50% is valid |
| Emotional Baseline | All fields default to sensible values |
| Social Patterns | All fields default to neutral/moderate |
| Speech Style | All fields default to average/moderate |
| Stress Response | All fields default to sensible values |
| Classification (alignment, tier) | Have meaningful defaults |

### Suggested (Not Required)

| Field | UI Treatment |
|-------|--------------|
| Values list | Show hint: "Add at least one core value" |
| Appearance fields | Optional enhancement |
| Body regions | Advanced feature |

### Schema Changes Needed

1. Update `CharacterBasicsSchema` to make `race` required (currently optional)
2. Keep `alignment` and `tier` optional with defaults

### Completion Calculation

```typescript
const REQUIRED_FIELDS = ['name', 'age', 'gender', 'summary', 'backstory', 'race'] as const;

// Completion = (filledRequiredFields / 6) * 100
// "Select..." values count as unfilled
```

### UI Changes

1. Remove per-card progress bars from all `IdentityCard` instances
2. Keep green checkmark (`hasContent`) for visual feedback on collapsed cards
3. Enhance header completion indicator to show percentage
4. Consider tooltip showing which required fields are missing

## Files to Modify

```text
packages/schemas/src/character/
├── basics.ts                     # Make race required in CharacterBasicsSchema

packages/web/src/features/character-studio/
├── signals.ts                    # Update completionScore to track 6 required fields
├── validation/
│   └── validateCharacterProfileBeforeSave.ts  # Add age, gender, race validation
├── components/
│   ├── IdentityPanel.tsx         # Remove completionPercent props, fix age input
│   ├── IdentityCard.tsx          # Keep as-is (prop becomes optional/unused)
│   ├── StudioHeader.tsx          # Enhance completion display
│   ├── BodyCard.tsx              # Remove internal completion calc
│   └── AppearanceCard.tsx        # Remove internal completion calc
```

## Success Criteria

- [ ] Single completion indicator in header
- [ ] No per-card progress bars
- [ ] Completion percentage reflects only required/intentional fields
- [ ] Clear visual feedback for missing required fields
- [ ] No confusion about pre-filled defaults

## Related Tasks

- TASK-001: Make race required in schema
- TASK-002: Update save validation for new required fields
- TASK-003: Refactor completion signals for required fields only
- TASK-004: Remove per-card progress bars from IdentityPanel
- TASK-005: Enhance header completion display
- TASK-006: Fix age input (remove spinner arrows)
- TASK-007: Add values suggestion hint
