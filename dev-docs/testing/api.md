# Api Test Coverage Analysis

Date: 2026-02-04
Scope: packages/api (tests + source review)

## Existing tests

Auth
- test/auth/middleware.test.ts
- test/auth/owner-email.test.ts
- test/auth/supabase.test.ts
- test/auth/token.test.ts

Utils
- test/utils/config.test.ts
- test/utils/version.test.ts
- test/utils/uuid.test.ts
- test/utils/json.test.ts
- test/utils/request-validation.test.ts
- test/utils/health.test.ts
- test/utils/responses.test.ts

Mappers + middleware
- test/mappers/item-mappers.test.ts
- test/mappers/message-mappers.test.ts
- test/mappers/profile-mappers.test.ts
- test/mappers/session-mappers.test.ts
- test/rate-limiter.test.ts

Services
- test/services/event-persistence.test.ts
- test/services/tier-service.test.ts
- test/services/turn-orchestrator.test.ts
- test/services/turn-orchestrator.integration.test.ts (skipped unless OPENROUTER_API_KEY)

Routes
- test/routes/system/config.test.ts
- test/routes/studio.generate-stream.test.ts
- test/routes/studio-error-handling.test.ts
- test/routes/sessions.get-session.test.ts
- test/routes/sessions.get-messages.test.ts
- test/routes/sessions.turns-unsubscribe.test.ts
- test/routes/users/workspace-drafts.test.ts

## What is covered today

Auth + config
- Local JWT tokens, supabase JWT verification, invite-only logic, auth middleware behavior.
- Config defaults and env parsing, version reading, health checks.

Utils and mappers
- Request validation helpers, response helpers, UUID validation.
- JSON BigInt conversion utilities.
- Mapper functions for items, messages, profiles, session list items.

Core services (partial)
- Event persistence sequencing, error handling.
- Tier service score updates and promotion logic.
- TurnOrchestrator basic processing and emit/tick behavior.

Routes (partial)
- /system/config health + config endpoints.
- /studio/generate, /studio/generate/stream, /studio/infer-traits error handling.
- /sessions/:id and /sessions/:id/messages for non-UUID actorId handling.
- /sessions/:id/turns unsubscribe-on-error path.
- /workspace-drafts full CRUD + error paths.

## Missing or thin coverage by area

Server bootstrap
- src/server.ts and src/server-impl.ts: world bus init, service start, data loading, CORS, route registration, error handler.

Loaders
- src/loaders/loader.ts: resolveDataDir behavior, loadData success/failure, deleteCharacterFile path matching.
- src/loaders/sensory-modifiers-loader.ts: happy path and error paths for missing or invalid JSON.

Routes - system
- src/routes/system/auth.ts: login flow, auth/me with invite-only filtering.
- src/routes/system/usage.ts: entity usage queries and error handling.

Routes - admin
- src/routes/admin/db.ts: overview/path/delete semantics and error mapping.
- src/routes/admin/sessions.ts: tooling-failure extraction and limit handling.

Routes - resources
- src/routes/resources/items.ts: list/filter, create/update/delete auth rules, invalid data handling.
- src/routes/resources/locations.ts: map and prefab CRUD, duplicate map, invalid location data handling.
- src/routes/resources/tags.ts: tag CRUD, session bindings, filtering and toggle behavior.

Routes - users
- src/routes/users/profiles.ts: characters + settings list/get/create/delete, file-vs-db behavior, owner checks.
- src/routes/users/preferences.ts: get/update preferences and workspace mode endpoints.
- src/routes/users/personas.ts: persona CRUD, session attachment, actor state wiring.

Routes - game
- src/routes/game/turns.ts: happy path, NPC spawn, response selection, timeout behavior.
- src/routes/game/hygiene.ts: all hygiene endpoints, validation, decay and sensory lookup.
- src/routes/game/schedules.ts: schedule templates CRUD and npc schedule CRUD paths.
- src/routes/game/sessions/*: list, create, create-full, delete, patch/delete message, list/create npcs, effective, overrides, heartbeat, disconnect.

Routes - stream and sensory
- src/routes/stream.ts: SSE filtering by session id, disconnect cleanup, safeJsonStringify usage.
- src/routes/sensory.ts: summary vs full template responses.

Services (untested modules)
- src/services/encounter-service.ts: narration generation, deterministic phrasing.
- src/services/projection-service.ts: manager lifecycle and replay logic.
- src/services/simulation-service.ts: prioritization, cache rules, triggers, time skip output.
- src/services/simulation-hooks.ts: turn/period/location/time-skip hooks and bulk updates.
- src/services/sensoryTemplates.ts: disk scan refresh, fallback to static templates.
- src/services/instances.ts: override and effective profile flow.
- src/services/schedule-service.ts: API re-export wiring (smoke test).

Game tools (LLM function calls)
- src/game/tools/definitions.ts: tool schemas and list.
- src/game/tools/handlers.ts: session tool queries, argument parsing, error paths.
- src/game/tools/gameplay-handlers.ts: examine/navigate/use item flows, inventory update and projections.
- src/game/tools/tool-args.ts: schema validation.

Data and type-only modules
- src/db/sessionsClient.ts: re-exports only; low risk.
- src/types/*: type-only or guards, minimal runtime behavior.

## Suggested next test targets (api package)

1) Session routes
- Create session, create-full, delete, list, message patch/delete, NPC list/create, effective, overrides, heartbeat/disconnect.

2) Resource routes
- Items, locations/prefabs, tags and session tag bindings.

3) Studio routes (modern flow)
- /studio/conversation, /studio/conversation/stream, /studio/summarize, /studio/suggest-prompt, /studio/dilemma endpoints, session CRUD.

4) Game services and tools
- Simulation service/hooks, encounter narration, gameplay tool handlers, session tool handlers.

5) Loader and sensory/template services
- loadData, resolveDataDir, deleteCharacterFile, sensory modifiers loader, live sensory templates.
