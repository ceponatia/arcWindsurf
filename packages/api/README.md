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

- `PORT=3001`
- `OPENROUTER_MODEL=deepseek/deepseek-chat`

Required for LLM calls:

```dotenv
OPENROUTER_API_KEY=REMOVED_SECRET
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324
```

The server will fail message requests if `OPENROUTER_API_KEY` is missing. See `/health` for `llm.configured`.
