# TASK-006: Remove Legacy DesktopLayout/MobileLayout (Cleanup)

**Priority**: P3
**Status**: 🔲 TODO
**Estimate**: 1-2h
**Plan**: PLAN-1.0
**Depends On**: TASK-004, TASK-005

---

## Description

After the responsive single-tree AppShell is stable, remove the legacy layout components and any dead code paths that depended on layout swapping.

This task keeps the codebase clean and prevents regressions.

## Acceptance Criteria

- [ ] `DesktopLayout` and `MobileLayout` are removed (or reduced to thin wrappers if still required)
- [ ] `AppShell` no longer branches on `useIsMobile()` to choose between two separate layout trees
- [ ] All imports and types related to the old layout split are cleaned up
- [ ] No new typecheck errors
