# API package audit (packages/api)

Date: 2025-12-18

## Scope

This is a static audit of `packages/api` with attention to:

- Security vulnerabilities and risk areas
- Inefficiencies and scalability risks
- Code that appears unused or legacy
- Duplicated patterns that should become shared utilities
- Cross-package references (what API relies on outside `packages/api`)

This audit is based on reading the route modules, core server wiring, and the primary DB/LLM integrations.

## TL;DR (prioritized)

### P0 (high risk if this is exposed beyond localhost)

1. No authentication/authorization across most routes.
   - Many endpoints allow reads/writes/deletes with no auth and no ownership checks.
   - Multi-user is implied by `user_id` query params, but `user_id` is fully client-controlled.

2. CORS is globally permissive.
   - Server allows `origin: '*'` for all routes.

3. Admin DB tooling is gated only by an env flag.
   - If `ADMIN_DB_TOOLS=true` in a deployed environment, endpoints expose DB path/overview and support deletes.

4. No rate limiting / abuse controls.
   - LLM routes and write-heavy endpoints can be abused to DoS the server or run up OpenRouter usage.

### P1 (medium risk / likely to cause bugs or performance issues)

1. Several endpoints use raw SQL (`pool.query`) and bypass the shared DB layer.
   - Inconsistent validation/serialization and harder to centralize access control.

2. Repeated request parsing/validation patterns across routes.
   - There is a shared helper (`util/request-validation.ts`) but it is unused.

3. Some modules appear unused (Ollama integration).

4. Some endpoints do many sequential DB writes in loops (notably hygiene).

## Findings

### Security and access control

#### 1) Global permissive CORS

- `packages/api/src/server.ts` configures CORS for all routes with `origin: '*'`.
  - This is fine for local dev but becomes risky once the API is reachable from a browser context in other environments.

Recommendation:

- Make CORS origin configurable (allowlist) and default to strict in non-dev.
- Consider also allowing `Authorization` header if you introduce auth.

#### 2) No auth and client-controlled identity

Several routes implement a “default user” concept using `user_id` query params:

- Location maps and prefabs: `user_id` query param defaults to `default`.
  - `packages/api/src/routes/locationMaps.ts`
- Workspace drafts: `user_id` query param defaults to `default`.
  - `packages/api/src/routes/workspaceDrafts.ts`
- User preferences: `user_id` query param defaults to `default`.
  - `packages/api/src/routes/userPreferences.ts`
- Personas: optional `user_id` filter for listing; create/upsert accepts `user_id` query param.
  - `packages/api/src/routes/personas.ts`

Impact:

- If you ever deploy this where multiple users can connect, any client can impersonate any `user_id` by changing the query string.
- Many other routes do not even attempt to partition by user and allow direct access by IDs.

Recommendation:

- Introduce an auth mechanism (even a simple dev token) and derive `userId` from auth context, not query params.
- If you want to keep `user_id` for now, gate it behind dev-mode and reject non-default values unless auth is enabled.

#### 3) Admin DB tooling is environment-gated only

- `packages/api/src/routes/adminDb.ts` gates dangerous endpoints behind `ADMIN_DB_TOOLS === 'true'`.

Impact:

- If this env var is accidentally enabled in any reachable environment, it exposes:
  - DB path/URL
  - Table overview + sample rows
  - Deletes by model/id

Recommendation:

- Require explicit auth for these routes.
- Also require an additional “are you sure” nonce or only bind these routes to localhost.
- Consider moving these endpoints behind a separate admin-only server.

#### 4) Tag ownership/auth hardcoded

- Tag endpoints hardcode `owner: 'admin'` with TODOs for auth context.
  - `packages/api/src/routes/tags.ts`

Impact:

- Any caller can create/update/delete tags under the admin owner identity.

Recommendation:

- Derive owner from auth.
- If you keep single-user mode, document that tags are globally mutable.

#### 5) Logging may leak request data

- Session creation logs the entire request body.
  - `packages/api/src/routes/sessions/session-crud.ts`

Impact:

- Request bodies can contain user text, persona content, or other sensitive data.

Recommendation:

- Remove or reduce body logging, or gate it behind a debug flag and redact long fields.

### Input validation and parsing

#### 1) Inconsistent JSON parsing/validation

Patterns seen:

- Many routes manually do `await c.req.json()` + `schema.safeParse(body)`.
- Some routes use type guards (e.g. session message request guard in `packages/api/src/routes/sessions/shared.ts`).
- A reusable helper exists but is unused:
  - `packages/api/src/util/request-validation.ts`

Impact:

- Lots of repetition and a higher chance of inconsistency in error shape and status codes.

Recommendation:

- Adopt `validateBody` / `validateOptionalBody` across routes.
- Standardize error bodies (either always `{ ok:false, error }` or a consistent shape per endpoint family).

#### 2) Unvalidated JSON columns mapped to typed objects

- Location maps load `nodes_json` / `connections_json` and cast directly to `LocationNode[]` / `LocationConnection[]` without schema validation.
  - `packages/api/src/routes/locationMaps.ts`

Impact:

- Corrupted or unexpected DB data can lead to runtime errors, broken UI, or subtle bad state.

Recommendation:

- Validate DB-loaded JSON using schemas on read (even if you don’t validate on write).
- Alternatively, validate at write-time only and treat DB as trusted.

### Error handling

#### 1) `process.exit(1)` used in data loader

- `packages/api/src/data/loader.ts` exits the process on invalid JSON or schema failures.
- `packages/api/src/server.ts` also exits on startup failure.

Impact:

- This is acceptable for “load at startup then serve” apps.
- It becomes less ideal if you ever call `loadData()` dynamically or want partial availability.

Recommendation:

- If the API ever needs dynamic reloads, return structured errors instead of exiting.

### Performance and scalability

#### 1) Hygiene routes do many sequential DB operations

- `initializeHygieneState` upserts once per body region.
- `updateHygieneState` upserts once per body region, and may do additional updates for cleaning.
  - `packages/api/src/routes/hygiene.ts`

Impact:

- This scales poorly with BODY_REGIONS length and with concurrent sessions.

Recommendation:

- Batch writes via transaction and/or multi-row insert/update patterns.
- If possible, store hygiene state as a single JSON blob per NPC/session.

#### 2) Raw SQL and mixed DB access layers

- Some endpoints use `db` (Prisma-like wrapper) while others use `pool.query` directly.
  - Example: `packages/api/src/routes/locationMaps.ts` and `packages/api/src/routes/sessions/session-create-full.ts`

Impact:

- Harder to implement cross-cutting concerns (authz, auditing, tracing, query metrics).

Recommendation:

- Prefer one DB access path.
- If raw SQL is needed for transactions or perf, consider isolating it behind `packages/api/src/db/*` helpers.

#### 3) No explicit payload limits

- Some endpoints accept potentially large arrays/objects (`locationMaps` nodes/connections, drafts content, etc.).

Impact:

- Risk of memory pressure and slow JSON parse leading to DoS.

Recommendation:

- Add request body size limits and/or validate array sizes.

### Dead/unused code

#### 1) Ollama integration appears unused

- `packages/api/src/llm/ollama.ts` contains an Ollama adapter.
- `packages/api/src/util/health.ts` includes `checkOllama`.

Impact:

- Extra maintenance surface and confusion.

Recommendation:

- Either remove or wire it into `/health` and feature-flag provider selection.

#### 2) Request validation helper appears unused

- `packages/api/src/util/request-validation.ts` is not imported anywhere.

Recommendation:

- Either adopt it across routes or remove it.

### Consolidation opportunities

#### 1) Centralize request parsing + Zod validation

- Adopt `validateBody`/`validateOptionalBody` from `packages/api/src/util/request-validation.ts`.
- This would remove dozens of repeated try/catch blocks.

#### 2) Centralize “default user” handling

- The `user_id ?? 'default'` pattern repeats in multiple route modules.

Recommendation:

- Add a single helper like `getUserId(c)` with clear rules (dev-mode vs auth-mode).

#### 3) Centralize JSON parsing fallbacks

- `packages/api/src/sessions/instances.ts` implements a local `parseJson` helper.

Recommendation:

- Consider reusing/expanding `packages/api/src/util/json.ts` for common “parse or fallback” behavior.

## Cross-package dependency trace

Key external package dependencies used by API code paths:

- `@minimal-rpg/schemas`
  - Zod schemas + domain types for characters, settings, items, tags, hygiene, schedules, etc.
- `@minimal-rpg/db/node`
  - `pool` (pg) and higher-level helpers like user preferences.
- `packages/db/src/*` (indirectly via `@minimal-rpg/db/node`)
  - Implements the Prisma-like wrapper and session/state logic.
- `@minimal-rpg/governor`, `@minimal-rpg/agents`
  - Used by turns/governor integration to run tool-based turn logic.

## Suggested roadmap

1. Decide environment model:
   - If this API is only for local dev, document that assumption and gate risky behavior behind explicit `DEV` flags.
   - If it might be deployed, implement auth + request limits first.

2. Add baseline safety:
   - CORS allowlist
   - Rate limiting (at least on LLM routes)
   - Remove/guard sensitive logs

3. Reduce repetition:
   - Adopt shared request validation helper
   - Add shared `getUserId` helper

4. Normalize DB access:
   - Either wrap raw SQL usage behind domain DB modules or migrate to a single access layer.
