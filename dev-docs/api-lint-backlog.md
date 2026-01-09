# API Lint Backlog (2026-01-09)

## Context

- `turbo run lint --filter @minimal-rpg/api` currently fails with ~700+ lint errors across sessions, resources, services.
- Errors are dominated by `any` usage, unsafe assignments/arguments/member access, and unused variables.
- I removed a duplicated legacy Prefabs routes block in `packages/api/src/routes/resources/locations.ts`, fixing the parse error and added missing imports. Codacy CLI reports no new issues for that file.


## Next Steps (suggested)

- Prioritize refactoring `session-*` route files to use typed request bodies and DB record types (replace `any`).
- Extract shared DTO/types into `packages/api/src/types.ts` or domain-specific `types.ts` files to reduce repetition.
- Update service files (`simulation-hooks.ts`, `instances.ts`, `tier-service.ts`) to stop carrying `any` state blobs; shape them with `@minimal-rpg/schemas` types and narrow error handling.
- Consider enabling incremental lint fixes per folder to avoid timeouts.
