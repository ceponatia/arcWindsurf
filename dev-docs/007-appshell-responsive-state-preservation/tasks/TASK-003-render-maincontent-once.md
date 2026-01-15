# TASK-003: Render MainContent Once (Prevent Remount on Breakpoints)

**Priority**: P1
**Status**: 🔲 TODO
**Estimate**: 2-4h
**Plan**: PLAN-1.0
**Depends On**: TASK-002

---

## Description

Refactor AppShell so `MainContent` is rendered exactly once and is not conditionally swapped by `useIsMobile()`.

The shell can still change navigation presentation (sidebar vs drawer) using responsive CSS, but the active view subtree must remain mounted across breakpoint changes.

## Implementation Notes

- Replace `return isMobile ? <MobileLayout/> : <DesktopLayout/>` with a single layout tree.
- Use responsive CSS classes to hide/show nav chrome appropriately.
- Ensure `MainContent` and its props are not recreated in a way that forces remount (avoid `key` changes tied to viewport).

## Validation Guidance

- Start a Character Studio conversation.
- Resize across 768px and verify the conversation remains.
- Repeat with another view (Session Workspace or a builder) to confirm the solution is app-wide.

## Acceptance Criteria

- [ ] `MainContent` is rendered in a single location in AppShell (not duplicated, not swapped)
- [ ] Resizing across the mobile breakpoint does not clear Character Studio chat history
- [ ] Resizing across the mobile breakpoint does not reset form input in at least one builder view
- [ ] No new typecheck errors
