# API Routes

Hono route handlers for the REST API.

## Overview

Each file registers routes on the Hono app instance.

## Route Files

- **sessions.ts** — Session CRUD, message handling, NPC instance management, character/setting overrides
- **profiles.ts** — Character and setting profile endpoints (list, get, create, update, delete)
- **items.ts** — Item management endpoints
- **tags.ts** — Prompt tag CRUD operations
- **turns.ts** — Governor-based turn processing (experimental)
- **config.ts** — Runtime configuration endpoints
- **adminDb.ts** — Database administration endpoints (reset, health checks)

## Pattern

Routes follow a dependency injection pattern:

```ts
export function registerSessionRoutes(app: Hono, deps: SessionRouteDeps): void;
```
