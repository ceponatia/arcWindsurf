# TASK-004: Mobile Navigation Drawer as Behavior (Not a Separate Layout)

**Priority**: P2
**Status**: 🔲 TODO
**Estimate**: 2-3h
**Plan**: PLAN-1.0
**Depends On**: TASK-003

---

## Description

Implement mobile navigation as an overlay drawer within the single responsive AppShell tree.

The drawer must not cause `MainContent` to unmount. It should only affect layout chrome.

## Implementation Notes

- Use CSS + state for drawer open/close.
- On small screens:
  - A header button toggles the drawer.
  - Drawer is a fixed overlay on top of content.
- On desktop:
  - Sidebar is visible.
  - Drawer state should not matter.

## Acceptance Criteria

- [ ] Mobile nav uses an overlay drawer within the single AppShell tree
- [ ] Opening/closing the drawer does not remount `MainContent`
- [ ] Clicking a nav item closes the drawer and navigates correctly
- [ ] Focus/scroll remains reasonable after closing the drawer (no jump-to-top regressions)
