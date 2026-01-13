# @minimal-rpg/web

Web frontend for Minimal RPG.

## Develop

Run the dev server (Vite):

```fish
pnpm -F @minimal-rpg/web dev
```

By default, API requests target `http://localhost:3002`. You can override the base URL:

```fish
set -x VITE_API_BASE_URL http://localhost:3002
pnpm -F @minimal-rpg/web dev
```

## Build

```fish
pnpm -F @minimal-rpg/web build
```

## Configuration

- `VITE_API_BASE_URL`: Base URL for the API server. Defaults to `http://localhost:3002` if not set.

Expected API endpoints:

- `GET /characters`
- `GET /settings`
- `POST /sessions`
- `GET /sessions/:id`
- `POST /sessions/:id/messages`

When running locally, start the API on port `3002` or set `VITE_API_BASE_URL` to match your API host.
