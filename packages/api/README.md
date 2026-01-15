# @minimal-rpg/api

Backend API package for Minimal RPG.

Status: OpenRouter-based runtime (DeepSeek by default).

## Environment Variables

This monorepo uses a single repo-root `.env`.

Create a repo-root `.env` (copy the example). From the repo root:

```bash
cp .env.example .env
```

Defaults (used if not set):

- `PORT=3002`
- `OPENROUTER_MODEL=deepseek/deepseek-chat`

Required for LLM calls:

```dotenv
OPENROUTER_API_KEY=REMOVED_SECRET
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324
```

The server will fail message requests if `OPENROUTER_API_KEY` is missing. See `/health` for `llm.configured`.

## Supabase Auth (optional)

If Supabase auth is configured, the API will verify Bearer tokens using Supabase's remote JWKS.

```dotenv
# Enable auth checks for non-public routes
AUTH_REQUIRED=true

# Supabase JWT verification
SUPABASE_JWT_ISSUER=https://<ref>.supabase.co/auth/v1
SUPABASE_PROJECT_URL=https://<ref>.supabase.co

# Optional audience check (only set if you rely on aud)
# SUPABASE_JWT_AUDIENCE=authenticated

# Optional: explicit allowlist of accepted JWT signing algorithms.
# Recommended for Supabase: RS256
SUPABASE_JWT_ALGS=RS256
```

Notes:

- `SUPABASE_PROJECT_URL` is used to derive the JWKS URL as `${SUPABASE_PROJECT_URL}/auth/v1/.well-known/jwks.json`. You can also set `SUPABASE_JWKS_URL` directly.
- `SUPABASE_JWT_ALGS` defaults to a safe asymmetric-only allowlist and intentionally excludes `HS*` algorithms to prevent JWT algorithm confusion.
