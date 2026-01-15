# TASK-008: Playwright Regression Test - Resize Does Not Lose State

**Priority**: P3
**Status**: 🔲 TODO
**Estimate**: 2-4h
**Plan**: PLAN-1.0
**Depends On**: TASK-003

---

## Description

Add an automated Playwright test that verifies resizing across the AppShell breakpoint does not clear the active view state.

Start with Character Studio as the canary, since it is the most user-visible example.

## Acceptance Criteria

- [ ] Playwright test navigates to Character Studio and creates visible state (e.g., sends a message or edits a field)
- [ ] Test resizes viewport across the breakpoint (e.g., 1024px → 700px → 1024px)
- [ ] Previously created state is still visible after resize
- [ ] Test is deterministic and does not require real LLM calls
