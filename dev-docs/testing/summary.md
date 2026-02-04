# Test Coverage Summary

## Scope

Cross-package summary for test coverage docs under `dev-docs/testing/`.

## Overall Status

- Strong unit coverage in backend/service packages (actors, api, bus, characters, db, generator, llm, retrieval, schemas, services, workers).
- Frontend packages (ui, web) have a smaller unit baseline and benefit most from component and E2E expansion.

## Common Gaps

- UI/component rendering and interaction tests for shared components and feature screens.
- Integration flows across packages (web to api to services) are lightly covered.
- Error and edge cases often missing in utility and scheduling paths (retry, failure branches, invalid inputs).

## Recommended Suites by Package Type

### Backend/Service Packages

- Primary: Vitest unit tests.
- Secondary: targeted integration tests for bus/db interactions and scheduler/worker wiring.
  - No additional tooling is required beyond Vitest for these packages.

### Frontend Packages (`ui`, `web`)

- Primary: Vitest + Testing Library component tests.
- Secondary: Playwright E2E for core user flows.
- Optional: visual regression snapshots for high-risk UI changes.
  - These are the only package types where additional tooling beyond Vitest is recommended.

## Prioritized Cross-Package Additions

1. Expand Playwright coverage for critical user flows (session creation, chat, builder save/delete).
2. Add component tests for shared UI primitives and major web screens.
3. Add integration tests for worker/scheduler/heartbeat and streaming retry paths.
4. Add missing error/edge-case tests in parsers/utilities.

## Notes

- The per-package documents remain the source of truth for detailed gaps and suggested tests.
