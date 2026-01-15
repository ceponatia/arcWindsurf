# TASK-001: Audit and Document Mount-Reset Patterns

**Priority**: P1
**Status**: 🔲 TODO
**Estimate**: 1-2h
**Plan**: PLAN-1.0

---

## Description

Identify app features that reset state on mount (or on view render) such that a layout remount causes data loss or a perceived refresh.

This task is primarily an audit + documentation task to de-risk the AppShell refactor. It should produce an actionable list of callsites and recommended trigger conditions ("explicit intent" instead of "mount").

## Scope

- Search for patterns like "reset on mount", "clear store", or "initialize" in feature hooks/components.
- Focus on views rendered by AppShell `MainContent` (Character Studio, Session Workspace, Chat Panel, builders, etc.).
- Confirm whether any resets are safe (idempotent) or destructive (clears user-visible state).

## Suggested Approach

- Grep for `reset` functions called inside `useEffect(() => { ... }, [])` or `useEffect(() => { ... }, [id])`.
- Grep for direct store mutations on mount in Zustand, Signals, or other state containers.
- Add a short "before/after" recommendation per callsite.

## Deliverable

Add a new section to the plan with a table of callsites:

- Feature
- File + function
- What resets
- Why it exists
- When it should actually trigger

## Acceptance Criteria

- [ ] Plan doc includes a "Mount-reset audit" section with a table of at least the major AppShell views
- [ ] Each entry includes a recommended non-mount trigger (explicit user intent or id change)
- [ ] Character Studio mount reset behavior is captured as a known example with a recommended alternative trigger
