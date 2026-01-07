# API Routes

Hono route handlers for the REST API.

## Overview

Each file registers routes on the Hono app instance.

## Route Files

- **sessions.ts** — Session CRUD, message handling, NPC instance management, character/setting overrides
- **profiles.ts** — Character and setting profile endpoints (list, get, create, update, delete)
- **personas.ts** — Player character (persona) management and session attachment
- **items.ts** — Item management endpoints
- **tags.ts** — Prompt tag CRUD operations
- **turns.ts** — World Bus turn processing (actors + services)
- **config.ts** — Runtime configuration endpoints
- **adminDb.ts** — Database administration endpoints (reset, health checks)

## Pattern

Routes follow a dependency injection pattern:

```ts
export function registerSessionRoutes(app: Hono, deps: SessionRouteDeps): void;
```

## Persona API Endpoints

The persona routes provide CRUD operations for player characters and session attachment:

### Persona CRUD

- `GET /personas?user_id=<id>` — List all personas (optionally filtered by user_id)
- `GET /personas/:id` — Get full persona profile by ID
- `POST /personas?user_id=<id>` — Create new persona (user_id required)
- `PUT /personas/:id` — Update existing persona
- `DELETE /personas/:id` — Delete persona

### Session Persona Attachment

- `POST /sessions/:sessionId/persona` — Attach persona to session (body: { personaId })
- `GET /sessions/:sessionId/persona` — Get active session persona with overrides
- `PUT /sessions/:sessionId/persona/overrides` — Update session-specific persona overrides
- `DELETE /sessions/:sessionId/persona` — Detach persona from session

Session personas allow per-session character customization through the overrides field without modifying the base persona profile.
