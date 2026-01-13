# TASK-001: Verify Save/Load Flow

**Priority**: P0
**Estimate**: 1 hour
**Phase**: 0 - Verification
**Blocks**: TASK-001a-fix-character-create-db-error

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

- [x] New character form initializes with empty/default values
- [x] Save button triggers API call
- [x] API returns success response
- [x] Character list shows saved character
- [x] Loading character populates `characterProfile` signal
- [x] No console errors during flow

Status: TASK-001a-fix-character-create-db-error completed.

## If Issues Found

Document issues in a new file: `TASK-001b-fix-<issue>.md`

Common issues to watch for:

- Required fields missing defaults
- API validation errors
- Signal not updating on load
- Navigation issues between list and editor

## Acceptance Criteria

- [x] Complete flow documented as working OR
- [x] Blocking issues identified and documented for fix
- [x] No console errors during save/load flow

---

## Verification Log (2026-01-12)

Verified flow using Playwright automation:
1. **Form Initialization**: Confirmed "Name" and "Summary" fields are empty with correct placeholders. "Age" starts at 0 and "Gender" defaults to "Select...".
2. **Save Flow**: Created character "Playwright Test User". POST to `http://localhost:3002/characters` returned `201 Created`.
3. **List View**: Navigated to `/characters` and confirmed "Playwright Test User" appears in the character list.
4. **Load Flow**: Clicked the character card. URL updated with character ID. All fields (Name, Age, Gender, Summary) were correctly populated in the editor.
5. **Console**: No errors found (except favicon.ico 404).
