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

## Open Questions

1. **Which fields should be required?**
   - Currently only `name`, `summary`, `backstory` are validated on save
   - Should we require at least one value? One fear?
   - Should race/alignment/tier be required?

2. **Should we show field-level indicators?**
   - Keep the green checkmark (`hasContent`) on cards?
   - Add red indicator for missing required fields?

3. **Weighted completion?**
   - Should backstory (free-text, effort) count more than name (single field)?
   - Or simple percentage based on required field count?

## Files to Modify

```text
packages/web/src/features/character-studio/
├── signals.ts                    # Update sectionCompletion, completionScore
├── components/
│   ├── IdentityPanel.tsx         # Remove completionPercent props
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

- Define required fields schema (TASK-001)
- Update completion signals (TASK-002)
- Remove per-card progress bars (TASK-003)
- Enhance header completion display (TASK-004)
