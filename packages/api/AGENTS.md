# @minimal-rpg/api

## Purpose

HTTP backend server exposing REST endpoints for the game client. Handles requests, validates input, and delegates to domain packages for business logic.

## Scope

- HTTP routes and controllers (Hono framework)
- Request validation and auth/permissions
- Middleware and webhooks
- Transport-level concerns only; no domain logic

## Package Connections

- **governor**: Delegates turn processing via `handleTurn`
- **db**: Loads and persists sessions, messages, profiles, and instances
- **schemas**: Validates request/response shapes
- **state-manager**: Retrieves effective state for sessions
- **agents**: Provides agent instances to governor
- **retrieval**: Invokes retrieval for context building
- **characters**: Loads character data for sessions
- **utils**: Shared helpers (errors, parsing)
