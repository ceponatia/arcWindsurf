# TASK-001: Verify Save/Load Flow

**Priority**: P0
**Estimate**: 1 hour
**Phase**: 0 - Verification
**Blocks**: None

---

## Objective

Verify that the character creation and loading flow works end-to-end before making changes to the UI components.

## Steps

1. Start the development server
2. Navigate to Character Studio
3. Create a new character with minimal fields (name, basic info)
4. Save the character
5. Verify character appears in database
6. Load the character back
7. Verify all saved fields populate correctly

## What to Check

- [ ] New character form initializes with empty/default values
- [ ] Save button triggers API call
- [ ] API returns success response
- [ ] Character list shows saved character
- [ ] Loading character populates `characterProfile` signal
- [ ] No console errors during flow

## If Issues Found

Document issues in a new file: `TASK-001a-fix-<issue>.md`

Common issues to watch for:

- Required fields missing defaults
- API validation errors
- Signal not updating on load
- Navigation issues between list and editor

## Acceptance Criteria

- [ ] Complete flow documented as working OR
- [ ] Blocking issues identified and documented for fix
