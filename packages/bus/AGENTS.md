# @minimal-rpg/bus

## Purpose

Event-stream backbone for the simulation ("World Bus"). Provides a typed event API with a pluggable transport (currently Redis pub/sub) and optional middleware (telemetry, persistence).

## Scope

- WorldBus API (`emit`, `subscribe`, `unsubscribe`) and basic lifecycle
- Transport adapters (e.g. Redis pub/sub)
- Bus-level event types/schemas and validation
- Middleware for cross-cutting concerns (telemetry, persistence)
- Shared infrastructure helpers needed by the bus (e.g. Redis client)

This package should stay transport- and infrastructure-focused. Domain-specific mechanics belong in `@minimal-rpg/services` (system services) and higher-level orchestration belongs in `@minimal-rpg/governor` / `@minimal-rpg/api`.

## Package Connections

- **schemas**: Uses shared event/domain types and Zod validation
- **services**: System services subscribe to intents and emit effects/state changes
- **agents**: Agents emit intents and consume sensory events
- **api**: Bridges HTTP/SSE to event streams and persistence
- **web**: Consumes streamed events for real-time UI updates
