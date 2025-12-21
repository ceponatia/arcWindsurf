# Ownership + Authorization Refactor Plan (Private-by-default)

Date: 2025-12-20

## Goal

Refactor the DB schema and API routes so that:

- A non-admin user can only see and mutate their OWN rows.
- Some rows can be intentionally shared as public (owner set explicitly to `public`).
- Anything tied to a session is always private to the session owner (no public sessions).
- Admin tooling can still access everything, but remains strongly gated.

This plan assumes Supabase Auth (magic link) is the identity provider and the API is the enforcement point (server-side DB connection).

## Guiding Principles

- Default-deny: no route should ever return global data without an explicit ownership scope.
- Ownership is derived server-side from auth context, never trusted from request bodies or query params.
- Make publicness explicit, not implied.
- Prefer DB constraints that make data exfiltration or cross-tenant corruption hard, even if a bug exists in API code.
- Keep errors non-informative: unauthorized access should not confirm existence of private rows.

## Identity and Ownership Model

### Canonical user key (now)

- Ownership key: verified email address from Supabase JWT claims.
- Store and compare emails case-insensitively.

Implementation details:

- Normalize: `owner_email = email.trim().toLowerCase()`.
- Reserve the literal string `public` (case-sensitive after normalization) as the public owner.
- Prevent empty strings.

### Future-proofing (later)

Email can change. For a future dashboard/full accounts rollout, the safer long-term owner key is the stable Supabase user id (`sub`) or `supabase_user_id`.

To keep the current requirement (email ownership) but avoid painting into a corner:

- Keep `user_accounts.supabase_user_id` populated when available.
- Add a plan to migrate ownership from email to stable id later, or to store both.

## Schema Strategy

### Global convention

All user-data tables get:

- `owner_email TEXT NOT NULL`

Rules:

- `owner_email = 'public'` is allowed only for tables that are intended to support public rows.
- Session-linked tables never allow `owner_email = 'public'`.

Core check constraint:

```sql
ALTER TABLE <table>
  ADD COLUMN owner_email TEXT NOT NULL;

ALTER TABLE <table>
  ADD CONSTRAINT <table>_owner_email_nonempty
  CHECK (length(owner_email) > 0);
```

Public support constraint (only on tables that can be public):

```sql
-- optional: enforce either valid-ish email or 'public'
ALTER TABLE <table>
  ADD CONSTRAINT <table>_owner_email_format
  CHECK (
    owner_email = 'public'
    OR owner_email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
  );
```

Private-only constraint (session-linked tables):

```sql
ALTER TABLE <table>
  ADD CONSTRAINT <table>_no_public_owner
  CHECK (owner_email <> 'public');
```

Indexing:

```sql
CREATE INDEX IF NOT EXISTS idx_<table>_owner_created
  ON <table>(owner_email, created_at DESC);
```

### Session ownership (no public sessions)

Add to `user_sessions`:

- `owner_email TEXT NOT NULL`
- `CHECK (owner_email <> 'public')`

Add a unique composite key for cross-owner foreign keys:

```sql
ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_owner_email_nonempty
  CHECK (length(owner_email) > 0);

ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_no_public_owner
  CHECK (owner_email <> 'public');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_sessions_id_owner
  ON user_sessions(id, owner_email);

CREATE INDEX IF NOT EXISTS idx_user_sessions_owner_created
  ON user_sessions(owner_email, created_at DESC);
```

### Session-linked tables: enforce same-owner references

Any table that references a session should also store `owner_email` and be constrained to match.

Example: `messages` (similar pattern for `npc_messages`, `character_instances`, `setting_instances`, state slice tables, etc.)

```sql
ALTER TABLE messages
  ADD COLUMN owner_email TEXT NOT NULL;

ALTER TABLE messages
  ADD CONSTRAINT messages_no_public_owner
  CHECK (owner_email <> 'public');

-- Composite FK ensures messages can only reference sessions with the same owner
ALTER TABLE messages
  ADD CONSTRAINT fk_messages_session_owner
  FOREIGN KEY (session_id, owner_email)
  REFERENCES user_sessions(id, owner_email)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_owner_session_idx
  ON messages(owner_email, session_id, idx);
```

Repeat for:

- `npc_messages`
- `character_instances` (and keep "exactly one primary per session" constraint)
- `setting_instances`
- `session_history` (already has `owner_user_id`; add/replace with `owner_email` and composite FK)
- `state_change_log`
- `tool_call_history`
- `conversation_summaries`
- Any `session_*` tables: `session_location_state`, `session_inventory_state`, `session_time_state`, `session_affinity_state`, `session_npc_location_state`, caches, etc.

Notes:

- Composite FK is the main defense to prevent cross-tenant references.
- Where a table references multiple parents, prefer composite FKs to each.

### Public-capable, non-session tables

All tables are user-owned by default. Public rows are opt-in.

Candidates (based on current schema and routes):

- `character_profiles` (user-authored templates)
- `setting_profiles`
- `persona_profiles` (if meant to be shareable)
- `locations`, `location_maps`, `location_prefabs`, prefab tables (if builder output is shareable)
- `prompt_tags` (depending on whether tags are user-specific or globally shared)
- `item_definitions` (possibly global; but if users can create definitions, make them ownable + public-capable)

For each public-capable table:

- Add `owner_email TEXT NOT NULL`
- Add indexes `(owner_email, created_at)` and any lookups needed
- Consider unique constraints scoped by owner, for example:

```sql
-- Example: prevent two maps with same name per owner
CREATE UNIQUE INDEX IF NOT EXISTS uniq_location_maps_owner_name
  ON location_maps(owner_email, name);
```

### Admin-only conversions to public

Rule:

- Only admin can set `owner_email = 'public'`.

Implementation:

- Public creation and "make public" transitions are done only by admin routes.
- For non-admin builder UX, offer "request publish" (optional) rather than direct publish.

Builder caveat (future): Private/Public toggle

- Builders will eventually include a UI toggle: `visibility = private | public`.
- That toggle maps to ownership as follows:
  - `private` => persist with `owner_email = ownerEmail` (derived from auth).
  - `public` => persist with `owner_email = 'public'`.
- Server-side enforcement must treat the toggle as a request, not an authority:
  - Non-admin users: `public` either (a) creates as private and marks `publish_requested=true` (recommended), or (b) is rejected with 403/400.
  - Admin users: allowed to create/update rows with `owner_email = 'public'`.
- Unpublish flow: switching from `public` back to `private` should be admin-only initially (prevents content disappearance/abuse), and should be audited.

Notes:

- The safest initial implementation is: builders always create private rows; only admins can publish/unpublish. The UI toggle can be shown but treated as "request publish" until you are comfortable opening self-publish.
- If you later allow self-publish, gate it behind explicit configuration (example: `ALLOW_SELF_PUBLISH=true`), rate limits, and tight validation, since public rows are visible to all users.

## API Authorization Refactor

### Standard route behavior

- Derive `ownerEmail` from `getAuthUser(c)`.
- If `AUTH_REQUIRED=true`, all non-public routes require auth.
- Do not accept `owner_email` from clients for non-admin routes.

Routing rules:

- Private tables: always `WHERE owner_email = $ownerEmail`.
- Public-capable tables: list endpoints return:
  - `WHERE owner_email = $ownerEmail OR owner_email = 'public'`
  - optionally a query flag to include/exclude public rows, but default should include both only when it is safe.

Important: sessions are never public:

- `GET /sessions` returns only sessions where `owner_email = me`.
- `GET /sessions/:id` must confirm the session belongs to me.
- Same for any `/sessions/:id/...` subroutes.

### Avoid existence leaks

For private resources:

- If a user requests a row they do not own, return 404, not 403.
- Log the attempt server-side with user identity and request id.

For public-capable resources:

- If a user requests a `public` row, return it (read-only).
- If a user attempts to mutate a `public` row and is not admin, return 404 (preferred) or 403.
- Always include ownership in the write WHERE clause (prevents time-of-check/time-of-use bugs):
  - Update/delete private row: `WHERE id = $id AND owner_email = $ownerEmail`
  - Update/delete public row: only via admin route; do not share a code path that could forget the owner clause.

### Admin routes

Admin routes stay behind `requireAdmin` and may include owner filters:

- `GET /admin/...` endpoints can query any owner.
- Provide optional `ownerEmail` query parameter for troubleshooting, but default should be conservative.

Additional admin safety:

- Require explicit confirmation for destructive operations (at least in the UI; server-side can require a header like `X-Admin-Confirm: true`).
- Restrict admin routes by IP allowlist in production (Fly proxy headers) if practical.

## DB Layer Refactor

### Scoped DB functions

Update `@minimal-rpg/db` to provide scoped functions that take `ownerEmail` explicitly.

Examples:

- `listSessionsForOwner(ownerEmail)`
- `getSessionForOwner(ownerEmail, sessionId)`
- `deleteSessionForOwner(ownerEmail, sessionId)`

For public-capable tables:

- `getLocationMapVisibleToOwner(ownerEmail, id)` which allows owner or public.
- `listLocationMapsVisibleToOwner(ownerEmail, { includePublic: true })`

Hard rule:

- Non-admin API routes should only call scoped DB functions.
- Unscoped functions are admin-only and should live under an `admin` module namespace.

### Write rules

- On create: owner is always set to `ownerEmail` unless an admin route explicitly chooses `public`.
- On update/delete: include `WHERE id = $id AND owner_email = $ownerEmail`.

## Additional Security Features (Recommended)

### 1) DB role separation (defense in depth)

If feasible in Fly/Supabase:

- Use a restricted DB role for the API with no DDL privileges.
- Use a separate admin maintenance role for migrations and admin tooling.

Even without full separation, avoid exposing any SQL execution endpoints.

### 2) Rate limiting and abuse controls

- Add rate limiting for write-heavy routes and any LLM-triggering routes.
- Add request size limits (especially JSON bodies).

### 3) Logging hygiene

- Remove or gate any logs that print request bodies containing user content.
- Avoid logging JWTs or authorization headers.

### 4) Safer identifiers

- Continue using unguessable IDs (UUIDv4/ULID).
- Never use sequential numeric ids in user-facing routes.

### 5) CORS tightening

Production:

- Set `CORS_ORIGINS` allowlist; do not use `*`.

### 6) Reserved owner validation

- Reject any attempt (even by admin) to set `owner_email` to empty string.
- Reject any non-admin attempt to set `owner_email` to `public`.
- Consider reserving additional system owners (example: `system`) and disallowing them from user input.

### 7) Optional future: RLS

Even with server-side enforcement, Postgres Row Level Security can add defense-in-depth.

If adopted later:

- Add `owner_email` everywhere as planned.
- Use an approach to set a per-request DB session variable (or JWT claim) and define RLS policies around it.

This is optional and can be done after the app-layer refactor is stable.

## Test Plan

### DB-level tests

- Composite FK prevents cross-owner references:
  - cannot insert a `message` with `(session_id, owner_email)` that does not match `user_sessions`.
- `CHECK` constraints prevent `public` owners on session-linked tables.

### API-level tests

Using two test users:

- User A creates a session, messages, instances.
- User B cannot:
  - list A's sessions
  - fetch A's session by id
  - call any `/sessions/:id/*` subroute on A's session

Public-capable resources:

- Admin creates a public location map.
- User A and B can read it.
- Neither A nor B can update/delete it.

Leak prevention:

- Requests for someone else's private ids return 404 (not 403).

## Rollout Plan (No Backfill Needed)

Because Fly has no existing rows, we can ship this in a single migration + code deploy.

Suggested order:

1. Add `owner_email` columns + constraints + indexes + composite keys.
2. Update DB module functions to require `ownerEmail`.
3. Update all API routes to use scoped DB functions.
4. Add tests.
5. Turn on `AUTH_REQUIRED=true` and tighten CORS in production.

## Checklist of Tables to Touch (Initial Pass)

Session core (private-only):

- `user_sessions`
- `messages`
- `npc_messages`
- `character_instances`
- `setting_instances`

Session-derived metadata (private-only):

- `session_history`
- `state_change_log`
- `tool_call_history`
- `conversation_summaries`

Session state slices (private-only):

- `session_location_state`
- `session_inventory_state`
- `session_time_state`
- `session_affinity_state`
- `session_npc_location_state`
- caches/occupancy/simulation tables

Public-capable candidates (decide per-feature):

- `locations` and prefab/location map tables
- `character_profiles`, `setting_profiles`, `persona_profiles`
- `prompt_tags`
- `item_definitions`

## Open Questions

- Which tables are intended to be globally shared across users (true system content) vs user-owned-but-public-capable?
- Should public resources be editable only by admin, or also by the original author? (Recommended: admin-only edits for public rows.)
- Do we want a "publish request" workflow, or keep it manual/admin-only initially?
