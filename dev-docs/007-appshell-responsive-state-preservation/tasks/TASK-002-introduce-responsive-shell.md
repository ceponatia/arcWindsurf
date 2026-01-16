# TASK-002: Introduce ResponsiveShell Scaffold (No Behavior Change)

**Priority**: P1
**Status**: ✅ COMPLETED
**Estimate**: 1-2h
**Plan**: PLAN-1.0

---

## Description

Create a `ResponsiveShell` component that will become the single AppShell layout tree. This first step should be a scaffold-only refactor: the UI should behave the same as today (desktop layout looks like desktop, mobile layout looks like mobile) and navigation should work.

The key is to create a shared structure so we can later ensure `MainContent` is rendered exactly once.

## Notes

- Avoid swapping entire layout component trees by breakpoint.
- This task can keep the existing Desktop/Mobile CSS and markup, but should move shared concerns into a common shell component.

## Files to Modify (Likely)

- `packages/web/src/layouts/AppShell.tsx`
- New file(s) under `packages/web/src/layouts/` (e.g. `ResponsiveShell.tsx`)

## Acceptance Criteria

- [ ] `AppShell` uses a new `ResponsiveShell` component as the top-level layout wrapper
- [ ] Existing desktop and mobile navigation still work as before
- [ ] No new typecheck errors
- [ ] No visible regression in desktop layout
- [ ] No visible regression in mobile layout
