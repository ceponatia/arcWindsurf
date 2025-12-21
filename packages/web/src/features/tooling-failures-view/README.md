# tooling-failures-view

Development-only view for inspecting `tooling-failure` events persisted in session history.

## Requirements

- Web: `VITE_DB_TOOLS=true`
- API: `ADMIN_DB_TOOLS=true`

## Route

- Open `#/toolingfailures` in the web app.
  - On GitHub Pages (project site): `/rpg-light/#/toolingfailures`

## API

- Uses `GET /admin/sessions/:sessionId/tooling-failures?limit=...`.
