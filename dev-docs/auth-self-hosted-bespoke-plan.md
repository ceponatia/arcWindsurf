# Self-hosted bespoke auth plan (Hono + Postgres)

Date: 2025-12-18

## Goal

Ship a secure-enough, fully self-hosted authentication and authorization system that supports external playtesters while keeping the codebase maintainable.

This plan is designed around the current stack:

- API: `hono` (Node, TypeScript)
- DB: Postgres via `@minimal-rpg/db` (pg pool)
- Web: React + Vite

## Non-goals (initially)

- Enterprise SSO, SAML, SCIM
- Complex RBAC matrices
- 2FA (can add later)
- Multi-tenant organizations (can add later)

## Principles

- Prefer opaque session tokens over JWTs (simpler revocation, smaller attack surface).
- Use HttpOnly cookies to prevent token theft via XSS.
- Avoid CSRF by using `SameSite=Lax` or `Strict` and explicit origin checks.
- Store secrets as hashes (session tokens, reset tokens).
- Add rate limiting and lockouts from day 1.

## Recommended auth UX

Pick one of these two options:

### Option A (recommended): Email magic link (passwordless)

Pros:

- Fast onboarding for playtesters
- No password reset flows

Cons:

- Requires an email delivery provider (even self-hosted auth still needs SMTP/transactional email)

### Option B: Email + password

Pros:

- No dependency on email clicking

Cons:

- Requires password reset flows and stronger brute-force defenses

This document focuses on Option A, with Option B notes where it differs.

## Data model (DB)

You already have `user_accounts` for preferences. Extend it into a real user table and add auth tables.

### Table: user_accounts

Add columns:

- `email TEXT` (nullable until you enforce it)
- `email_verified_at TIMESTAMPTZ` (nullable)
- `roles TEXT[] NOT NULL DEFAULT '{}'` (example: `{admin}`)
- Keep `preferences JSONB`

Constraints:

- Unique `email` (case-insensitive). Either store `email_normalized` or use a CITEXT extension.

### Table: auth_login_codes (magic link)

Used to issue short-lived login tokens.

Columns:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE`
- `code_hash TEXT NOT NULL` (argon2 hash of a random token)
- `expires_at TIMESTAMPTZ NOT NULL`
- `consumed_at TIMESTAMPTZ`
- `ip TEXT` (optional)
- `user_agent TEXT` (optional)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Rules:

- Codes expire quickly (10-15 min).
- One-time use.

### Table: auth_sessions

Columns:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE`
- `token_hash TEXT NOT NULL` (argon2 hash of session token)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `expires_at TIMESTAMPTZ NOT NULL` (e.g. 30 days)
- `revoked_at TIMESTAMPTZ`
- `last_seen_at TIMESTAMPTZ`
- `ip TEXT` (optional)
- `user_agent TEXT` (optional)

Indexes:

- `(user_id, created_at desc)`
- `token_hash` lookup should be performant (hash is a string; consider storing a short prefix or a separate lookup key)

### Optional: auth_events

A lightweight audit trail.

- `event_type TEXT` (login_requested, login_succeeded, logout, session_revoked)

## API routes

Create a dedicated auth domain module:

- `packages/api/src/auth/*`

### Public endpoints

1. `POST /auth/request-link`
   - Body: `{ email: string }`
   - Behavior:
     - Normalize email.
     - Create user if not exists (or require invite-only: see below).
     - Create login code row.
     - Send email with link: `GET /auth/verify?token=...`

2. `GET /auth/verify?token=...`
   - Behavior:
     - Validate token against `auth_login_codes`.
     - Create `auth_sessions` row.
     - Set cookie `mra_session=<raw token>` (HttpOnly, Secure, SameSite=Lax).
     - Redirect to web app.

3. `POST /auth/logout`
   - Behavior:
     - Revoke current session.
     - Clear cookie.

4. `GET /auth/me`
   - Behavior:
     - Returns current user summary.

### Protected endpoint behavior

- Add Hono middleware `requireAuth`:
  - Read cookie.
  - Look up session by token.
  - Verify `expires_at` and not revoked.
  - Attach `user` to request context.

## Invite-only playtest mode

For external playtests, you usually want invite-only.

Add table `auth_invites`:

- `email TEXT PRIMARY KEY`
- `invited_by_user_id UUID` (nullable)
- `created_at TIMESTAMPTZ`
- `accepted_at TIMESTAMPTZ`

Rules:

- `POST /auth/request-link` only works if email is present in `auth_invites`.
- When the invite is used, set `accepted_at`.

## Web integration (React)

- Add an Auth page with email input.
- Call `POST /auth/request-link`.
- On verify redirect, the server sets the cookie and redirects back to the app.
- Use `fetch(..., { credentials: 'include' })` for API calls.

## CSRF and CORS

If using cookie auth, treat CSRF seriously.

Minimum defenses:

- Set cookie `SameSite=Lax` (or `Strict` if workable).
- Ensure API uses a strict CORS allowlist.
- For state-changing routes, enforce an origin check:
  - Allow only your web origin(s) in `Origin` / `Referer`.

If you need cross-site embedding or complex deployments, add CSRF tokens.

## Password-based variant (Option B)

If you choose passwords:

- Add `password_hash` to `user_accounts`.
- Use argon2id.
- Add `POST /auth/register`, `POST /auth/login`, `POST /auth/request-password-reset`, `POST /auth/reset-password`.
- Strongly recommend email verification before allowing write endpoints.

## Rate limiting and abuse controls

Implement at API layer (in-memory + IP-based is OK for early playtests, but a shared store is better):

- `/auth/request-link`: limit by IP and by email (example: 5 per hour).
- `/auth/verify`: limit by IP.
- Global limits for expensive endpoints (LLM).

Add account lockout style controls if password-based.

## Ownership and authorization

After auth exists, remove `user_id` query params and derive user identity from the session.

Minimum authz rules:

- User can only read/write their own drafts/maps/personas/sessions.
- Only `admin` can use admin DB routes.

## Implementation phases

### Phase 0: safety gate (same day)

- Tighten CORS allowlist.
- Add a global auth middleware that can be toggled with `AUTH_REQUIRED=true`.

### Phase 1: core auth (2-5 days)

- DB migrations for `auth_login_codes`, `auth_sessions`, plus `email` fields.
- Implement `/auth/request-link`, `/auth/verify`, `/auth/logout`, `/auth/me`.
- Add middleware and protect routes.

### Phase 2: authorization + ownership (3-7 days)

- Add `user_id` ownership columns to user-generated tables.
- Backfill existing rows to default user.
- Enforce ownership in routes.

### Phase 3: production-hardening (later)

- Add session management UI (list sessions, revoke all).
- Add audit logs.
- Add admin invitation UI.

## Operational requirements

Even with bespoke auth, you likely need an email provider:

- SMTP or transactional email API
- A configured sender domain

In staging, you can use a dev mailbox / local SMTP sink.

## Testing checklist

- Login link can be requested only if invited (if invite-only enabled).
- Login code is one-time and expires.
- Session cookie is HttpOnly + Secure in production.
- CSRF is mitigated via SameSite and origin checks.
- Unauthorized calls return 401.
- Ownership checks return 403.
