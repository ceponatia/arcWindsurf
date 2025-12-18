# Auth system: tool choice + implementation plan

Date: 2025-12-18

## Goal

Enable safe external playtesting with real user identity so we can:

- Restrict API access to invited users
- Attribute and isolate user-created data (drafts, maps, personas, sessions)
- Add basic roles (player vs admin) for debug tooling
- Avoid security footguns while moving fast

## Current state (what exists today)

- `packages/api` has no authentication/authorization.
- Several routes use `user_id` from the query string (often defaulting to `default`).
- CORS is globally permissive in the API.
- `packages/db` already has a minimal `user_accounts` table (preferences only):
  - Migration: `packages/db/sql/019_user_accounts.sql`
  - Code: `packages/db/src/users.ts`

This is a good starting point: we can evolve `user_accounts` into the canonical internal user record.

## Recommendation: best tool for external testers

### Recommended provider: Clerk (managed auth)

For the playtest phase, the best trade-off is a managed identity provider that ships:

- Email magic link and/or OAuth sign-in
- Invite-only / allowlist controls (critical for playtests)
- Rate limiting and bot protection options
- A stable, well-maintained React SDK
- JWT validation for custom backends

Why this is the best fit right now:

- The project uses a custom backend (`hono`), not a framework with batteries-included auth (e.g. Next.js).
- Rolling our own auth (password reset, email, account recovery, lockouts, abuse controls) is high-risk and time-consuming.
- We can still keep our own `user_accounts` table as the source of truth for app-level state, roles, and preferences.

### Alternative options (when to choose them)

1. Supabase Auth
   - Good if you already want a hosted Postgres + RLS-centric architecture.
   - More coupling to Supabase DB patterns.

2. Self-hosted auth (username/password or magic link)
   - Best if you must avoid third-party identity.
   - More engineering and security surface.
   - Plan included below as a long-term option.

## Architecture overview (Clerk)

### Flow

1. Web app signs in using Clerk.
2. Web app calls API with `Authorization: Bearer <JWT>` (short-lived token).
3. API validates JWT via Clerk JWKS and extracts `sub` (provider user id), email, etc.
4. API maps provider user -> internal `user_accounts` row.
5. API sets `c.var.user` (or similar) and enforces authorization rules (ownership, roles).

### Token transport

For playtest, prefer Authorization bearer tokens (stateless and avoids CSRF complexity).

- Pros: no CSRF, simplest cross-origin integration.
- Cons: frontend must attach the token to every request.

If you later want cookie sessions:

- Use `HttpOnly` cookies + `SameSite=Lax/Strict` + CSRF protection.
- Requires tighter control of domains and proxies.

## API implementation plan

### Step A - Add an auth middleware layer

Create a small domain module, for example:

- `packages/api/src/auth/types.ts`
- `packages/api/src/auth/verify.ts` (JWT verification)
- `packages/api/src/auth/middleware.ts` (Hono middleware)
- `packages/api/src/auth/roles.ts` (role helpers)

Key behaviors:

- Parse `Authorization` header.
- Verify JWT signature via Clerk JWKS.
- Extract claims: `sub`, `email`, maybe `org_id` if you use organizations.
- Upsert an internal user record based on `(provider, provider_user_id)`.
- Attach `user` to request context.

Public routes (no auth):

- `GET /health`
- `GET /config` (consider limiting to non-sensitive fields)

Everything else should be protected for external playtest.

### Step B - Standardize identity retrieval

Add a single helper like `requireUser(c)` that:

- Ensures middleware ran
- Returns `{ userId, roles }`

Then remove `user_id` query usage from routes and replace with server-derived `userId`.

### Step C - Authorization rules (minimal but correct)

Start with:

- Ownership checks: user can only access their own drafts/maps/personas/sessions.
- Admin role can access admin tools.

Add a route guard helper:

- `requireRole(c, 'admin')`

### Step D - Security hardening for playtest

- Tighten CORS: allowlist the web app origin(s).
- Add rate limiting at least for:
  - LLM endpoints
  - Large write endpoints
- Remove sensitive request-body logging.

## DB schema and migration plan

You already have `user_accounts(identifier, preferences)`.
For real auth, expand to support provider-linked identity.

### Add columns to `user_accounts`

Recommended columns:

- `auth_provider TEXT NOT NULL` (e.g. `clerk`)
- `provider_user_id TEXT NOT NULL` (the JWT `sub`)
- `email TEXT` (optional, but useful)
- `roles TEXT[] NOT NULL DEFAULT '{}'` (e.g. `{admin}`)
- Keep `preferences JSONB`

Constraints:

- Unique `(auth_provider, provider_user_id)`
- Optional unique `email` if you want it enforced

### Add ownership columns to user-created tables

Target tables (based on current routes):

- `workspace_drafts`: add `user_id UUID REFERENCES user_accounts(id)`
- `location_maps`: already has `user_id` as TEXT; migrate to UUID if feasible
- `location_prefabs`: same
- `personas` / `persona_profiles`: add `user_id`
- `user_sessions`: add `user_id`

Migration strategy:

1. Add new `user_id UUID` columns (nullable initially).
2. Backfill all existing rows to the `default` user.
3. Make columns `NOT NULL`.
4. Add indexes `(user_id, created_at)` and any required unique constraints.

### (Optional) Add an audit log table

For playtest, consider a lightweight audit table:

- `auth_events(id, user_id, event_type, ip, user_agent, created_at)`

Useful for debugging account access and abuse.

## Web app integration plan (React)

### Step A - Add Clerk React

- Add Clerk provider at app root.
- Add `SignIn` page/route.
- Add a `useApiClient()` wrapper that:
  - pulls JWT (via Clerk)
  - attaches `Authorization` header

### Step B - Handle auth states

- Logged out: show sign-in.
- Logged in: render app.
- Token refresh: handled by Clerk; fetch wrapper just calls `getToken()` before requests.

### Step C - UX for playtest

- Invite-only: enable Clerk allowlist/invite mode.
- Add a simple `Logout` button.

## Phased rollout plan

### Phase 0 (1 day): playtest gate (quick safety win)

If you need external testing immediately, implement a temporary gate in parallel:

- Require `Authorization: Bearer <PLAYTEST_SHARED_TOKEN>` for all routes (env configured).
- Tighten CORS to your staging web origin.

This is not “real auth”, but it buys safety while Clerk integration is underway.

### Phase 1 (2-4 days): Clerk auth end-to-end

- Web: sign-in + tokenized API requests
- API: JWT verification middleware
- DB: user mapping table fields and ownership backfill
- Replace `user_id` query param with server-side user identity

### Phase 2 (1-2 weeks): authorization and polish

- Admin role
- Lock down admin DB routes
- Rate limiting
- Observability (request id, structured logs)

### Phase 3 (later): decide long-term auth posture

- Keep Clerk (likely fine), or
- Migrate to self-hosted auth if requirements demand it

## Self-hosted alternative (if you decide against managed auth)

If you must self-host, recommend session-based auth with opaque tokens (not JWT):

- `auth_sessions(id, user_id, token_hash, expires_at, created_at, revoked_at)`
- Store the raw token only in an `HttpOnly` cookie.
- Use `argon2` to hash tokens.
- Implement CSRF protections (double-submit or origin checks).

This is more work but avoids vendor dependency.

## Testing checklist

- Unauthenticated requests return `401` for protected routes.
- Authenticated user cannot read/write another user’s drafts/maps/personas/sessions.
- Admin-only routes require admin role.
- Token verification failures are not logged with sensitive token content.
- CORS allowlist blocks random origins.

## Open questions to answer before implementation

- Is playtest invite-only (recommended) or open signup?
- Do we need OAuth (Google/GitHub) or email-only is fine?
- Will we host API and web on the same domain (cookie possible) or separate origins (bearer token recommended)?
- Do we want organizations/teams or strictly single-user accounts?
