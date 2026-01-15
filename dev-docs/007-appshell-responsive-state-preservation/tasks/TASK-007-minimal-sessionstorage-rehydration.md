# TASK-007: Minimal sessionStorage Rehydration (Optional)

**Priority**: P3
**Status**: 🔲 TODO
**Estimate**: 1-2h
**Plan**: PLAN-1.0

---

## Description

Optionally add minimal `sessionStorage` persistence for non-sensitive navigation keys to make the app more resilient to full reloads (not required to fix breakpoint remount).

This is intentionally small-scope and should avoid storing large payloads like conversation content.

## Suggested Data

- Current `viewMode`
- Active ids (character builder id, session id) if applicable

## Acceptance Criteria

- [ ] Only stable, non-sensitive keys are stored in `sessionStorage`
- [ ] Data is small and does not include chat logs or large serialized objects
- [ ] On full reload, AppShell restores the last view mode and ids when possible
- [ ] Feature views can still load missing data from the backend
