# TASK-005: Consolidate AppShell Chrome (Header/Footer/Nav) into Shared Components

**Priority**: P2
**Status**: ✅ COMPLETED
**Estimate**: 2-4h
**Plan**: PLAN-1.0
**Depends On**: TASK-003

---

## Description

Extract AppShell chrome into domain-focused components so responsive behavior is implemented via composition rather than swapping entire layout component trees.

This task makes the refactor sustainable and easier to evolve.

## Scope

- Extract and reuse navigation items across breakpoints.
- Extract shared header and footer logic.
- Ensure AppShell retains the same navigation targets and permissions behavior (admin links).

## Acceptance Criteria

- [ ] Navigation buttons are defined once and rendered in both desktop sidebar and mobile drawer
- [ ] Header and footer are shared and do not duplicate business logic
- [ ] AppShell file size is reduced by moving reusable UI into smaller modules
- [ ] No new typecheck errors
