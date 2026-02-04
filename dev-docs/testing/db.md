# DB Package Test Coverage Review

## Scope

Package: `@minimal-rpg/db`

Focus: compare existing tests vs. repository, connection, caching, migrations, seeds, and vector utilities.

## Existing Tests

- `test/connection.resolveDatabaseUrl.test.ts`
  - Covers `resolveDatabaseUrl` for local/supabase/default flows, missing envs, and error cases.
- `test/admin.repo.test.ts`
  - Exercises `getDbPathInfo`, `deleteDbRow`, and `getDbOverview` with SQL assertions.
- `test/actor-states.repo.test.ts`
  - Covers `upsertActorState`, `getActorState`, `listActorStatesForSession`, `bulkUpsertActorStates`.
- `test/events.repo.test.ts`
  - Covers `saveEvent` and `getEventsForSession` ordering and filters.
- `test/sessions.repo.test.ts`
  - Covers `createSession`, `getSession`, `listSessions`, `deleteSession`.
  - Covers projections/heartbeat helpers (`getProjection`, `getSessionProjection`, `upsertProjection`, `updateSessionHeartbeat`, `listStaleSessionsByHeartbeat`, `listRecentSessionsByHeartbeat`, `getSessionGameTime`).
- `test/entity-profiles.repo.test.ts`
  - Covers `createEntityProfile`, `getEntityProfile`, `listEntityProfiles`, `updateEntityProfile`, `deleteEntityProfile`.
- `test/locations.repo.test.ts`
  - Covers `createLocation`, `getLocation`, `listLocations`, `updateLocation`, `deleteLocation`.
- `test/prompt-tags.repo.test.ts`
  - Covers CRUD for prompt tags and session bindings + query options.
- `test/users.repo.test.ts`
  - Covers `getOrCreateDefaultUser`, `getUserByIdentifier`, `getUserRoleByIdentifier`, `ensureUserRole`, `ensureLocalAdminUser`, `verifyLocalUserPassword`, preferences helpers.
- `test/workspace-drafts.test.ts`
  - Covers `listWorkspaceDrafts`, `getWorkspaceDraft`, `createWorkspaceDraft`, `updateWorkspaceDraft`, `deleteWorkspaceDraft`, `pruneOldWorkspaceDrafts`.
- `test/world.repo.test.ts`
  - Covers location map and prefab CRUD with simple JSON payloads.
- `test/studio-sessions.test.ts`
  - Covers create/get/update/delete and TTL cleanup for studio sessions.
- `test/tags.test.ts`
  - Asserts SQL query fragments for the simplified tags repo.

## Notably Untested or Under-tested Areas

### Connection, Client, and Cache

- `src/utils/client.ts`
  - No tests for SSL toggle based on `isSupabaseUrl`, `registerType` hook, or `resolvedDbUrl` derivation.
  - Suggested: unit tests for `createPool` behavior with mocked `pg.Pool` constructor and `registerType` invocation.
- `src/cache/session-cache.ts`
  - No tests for `getCachedSession`, `setCachedSession`, `invalidateSessionCache` behavior or Redis key prefix.
  - Suggested: mock `ioredis` and verify JSON encoding, TTL, and delete calls.
- `src/utils/url-validator.ts`
  - No direct tests. Behavior relies on re-exports from `@minimal-rpg/utils`.
  - Suggested: shallow tests or cross-package validation in utils; otherwise document reliance.

### Migrations and Seeds

- `src/migrations/migrate.ts`
  - No tests for file discovery, ordering rules, extension creation handling, or error branches.
  - Suggested: unit tests with mocked fs/path/pool, including extension failures and connectivity error messaging.
- `src/seed.ts`
  - No tests for CLI argument parsing and seed execution path.
  - Suggested: unit tests for `parseSeedArgs` and opt-in test entities.
- `src/seeds/built-in-tags.ts`
  - No tests for insert vs. upsert behavior or query payloads.
- `src/seeds/test-entities.ts`
  - No tests for insert vs. upsert logic, and JSON conversion for map nodes/connections.

### Repositories (Partial Gaps)

- `src/repositories/world.ts`
  - Tests cover map/prefab CRUD, but not JSON validation failures and `LocationDataValidationError` details.
  - No coverage for `getLocationConnections` output (bidirectional, lockReason, missing map).
- `src/repositories/actor-states.ts`
  - No tests for `updateActorState`, `getSessionNpcsWithSchedules`, or schedule parsing/validation paths.
- `src/repositories/sessions.ts`
  - `getActiveSessions` is not covered.
- `src/repositories/users.ts`
  - No tests for `ensureUserByEmail` or preference merging edge cases (invalid JSON stored).
- `src/repositories/prompt-tags.ts`
  - No tests for `incrementVersion` edge cases, `updatePromptTag` changelog/version logic, or `clearSessionTagBindings`.
- `src/repositories/projections.ts`
  - No tests for `getActorsAtLocation`, `getInventoryItems`, `getInventoryItem`, or `getSessionGameTime` parsing failure cases.
- `src/repositories/dialogue.ts`
  - No tests for dialogue tree/state CRUD and the tree-switching branch.
- `src/repositories/faction.ts`
  - No tests for relationship clamping, bidirectional lookup, reputation level mapping, or upsert math.
- `src/repositories/tags.ts`
  - `test/tags.test.ts` only validates query fragments; no integration tests for actual CRUD behavior.
- `src/repositories/admin.ts`
  - Test coverage appears limited to happy paths; no coverage for error handling or non-existent rows.

### Vector

- `src/vector/pgvector.ts`
  - No tests for `registerType` wrapper and integration with pool `connect` hook.

## Suggested Test Additions (Prioritized)

1. Repository correctness with JSON validation and parsing edge cases
   - `LocationDataValidationError` branches in `world.ts`.
   - `getSessionNpcsWithSchedules` for valid/invalid schedules and placeholder mappings.
2. Connection and pool setup
   - `utils/client.ts` pool creation with supabase SSL, `registerType` invocation, and `resolvedDbUrl` behavior.
3. Session cache
   - Redis wrapper functions in `cache/session-cache.ts` (mocked ioredis).
4. Migrations and seeds
   - Ordering and filtering in `migrate.ts`; seed CLI arg parsing in `seed.ts`.
5. Domain-specific repositories
   - `dialogue.ts`, `faction.ts`, `projections.ts` behavior tests.

## Notes

- `node.ts` re-exports are untested; behavior is covered only insofar as underlying modules are tested.
- The simplified `tags.ts` repo has tests for SQL fragment composition, but not result mapping.
