# Supabase Auth short-term plan (identity provider only)

Date: 2025-12-18

## Goal

Use Supabase Auth quickly for external playtesting while keeping the existing architecture:

- Keep your current Postgres database and `@minimal-rpg/db` data access.
- Use Supabase only for authentication (GoTrue) and JWT issuance.
- API verifies Supabase JWTs and maps users to internal `user_accounts`.

This is the lowest-risk short-term path because it avoids migrating your data to Supabase or rewriting DB access around RLS.

## Why Supabase works well short-term

- Fast email magic links and OAuth providers.
- Built-in email templates and redirect flows.
- JWTs and JWKS support for backend verification.

## What we are not doing (short-term)

- Not using Supabase Postgres as the primary DB.
- Not using Supabase RLS as the main authorization mechanism.

Those can be evaluated later.

## High-level architecture

1. Web app signs in via Supabase Auth.
2. Web app receives `access_token` (JWT).
3. Web app calls API with `Authorization: Bearer <access_token>`.
4. API verifies JWT via Supabase JWKS and extracts `sub` (Supabase user id) + email.
5. API upserts internal `user_accounts` and sets `c.var.user`.
6. Routes enforce ownership and roles.

## Setup steps (Supabase)

### 1) Create a Supabase project

- Create project in Supabase dashboard.
- Configure Auth:
  - Enable Email magic link for playtesting.
  - Optional: enable Google/GitHub OAuth.

### 2) Configure redirect URLs

Add allowed redirect URLs for:

- Local dev (Vite)
- Staging web domain

### 3) Decide invite-only vs open signup

For playtest, recommend invite-only:

- Use Supabase email allowlist / domain restrictions, or
- Keep open signup but enforce allowlist in your API based on email.

The API allowlist approach is often simplest to start.

## Web integration (React)

### Dependencies

Add `@supabase/supabase-js`.

### Environment variables

In `packages/web`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Implementation sketch

- Create a Supabase client singleton.
- Implement login UI:
  - `signInWithOtp({ email, options: { emailRedirectTo } })`
- On app start:
  - read session via `supabase.auth.getSession()`
  - attach `session.access_token` to API requests

### API client wrapper

Centralize API calls:

- A fetch wrapper that obtains latest token
- Adds header `Authorization: Bearer <token>`

## API integration (Hono)

### Environment variables

In `packages/api`:

- `SUPABASE_PROJECT_URL`
- `SUPABASE_JWKS_URL` (or derive from project)
- `SUPABASE_JWT_AUDIENCE` (optional, depends on settings)
- `SUPABASE_JWT_ISSUER` (issuer URL)
- `AUTH_REQUIRED=true` for playtest

### JWT verification

Implement middleware:

- Parse Authorization bearer token.
- Verify signature using JWKS.
- Validate:
  - `iss` matches expected issuer
  - `aud` matches expected audience (if used)
  - token not expired
- Extract:
  - `sub` (Supabase user id)
  - `email`

### Map to internal user

Continue using your DB as the source of truth for game data.

- Add columns to `user_accounts`:
  - `auth_provider` = `supabase`
  - `provider_user_id` = JWT `sub`
  - `email`
  - `roles`

Upsert behavior:

- If `(auth_provider, provider_user_id)` exists, return it.
- Else create a row.

### Route protection

- Public: `/health`, minimal `/config`
- Protected: everything else

## Authorization and ownership

Supabase Auth gives identity, not authorization.

Implement these in your API and DB:

- Add `user_id` ownership columns to user-generated tables.
- Derive user id from auth middleware, not query params.

## Invite-only enforcement patterns

Two viable approaches:

### Option 1 (fast): API-side allowlist table

Add `auth_invites(email)` in your existing DB.

- On first request, if email not invited, return 403.

Pros:

- Full control from your app.
- Does not rely on Supabase dashboard settings.

### Option 2: Supabase-side allowlist

Use Supabase settings to restrict signup.

Pros:

- Less code.

Cons:

- Less flexible if you want game-specific gating logic.

## Implementation phases

### Phase 0 (same day): safety gate

- Tighten CORS allowlist.
- Require bearer token for protected routes.
- Add API-side allowlist (recommended for playtest).

### Phase 1 (1-3 days): Supabase auth end-to-end

- Web login UI
- Tokenized API requests
- API JWT verification middleware
- User mapping in `user_accounts`

### Phase 2 (3-7 days): data ownership

- Add `user_id` columns to key tables.
- Backfill existing data to default user.
- Enforce ownership in routes.

## Long-term migration path options

1. Keep Supabase Auth only (common, stable)
   - Continue to run your own DB and API.

2. Move more into Supabase (optional later)
   - Use Supabase Postgres + RLS for some tables.
   - Requires rethinking `@minimal-rpg/db` and transaction patterns.

## Testing checklist

- Logged-out user gets 401 on protected routes.
- Logged-in user can only access their own resources.
- Invited gating returns 403 for non-invited emails.
- Token verification rejects wrong issuer/audience.
- CORS rejects unknown origins.
