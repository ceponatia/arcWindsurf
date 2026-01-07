# @minimal-rpg/services

## Purpose

System services that implement world mechanics (physics, time, social, location, rules). Services consume intents from the World Bus and emit effects, state changes, and sensory events back onto the bus.

## Scope

- Physics and movement resolution (spatial queries, pathfinding, proximity)
- Time progression (tick emission, scheduling)
- Social simulation (dialogue, factions, relationship effects)
- Location graph operations (exit resolution, reachability)
- Rules validation and simulation hooks
- WorldBus wiring: subscribe to intent events, emit effect/state events

This package should remain focused on mechanics and service orchestration. Avoid HTTP concerns (handled by `@minimal-rpg/api`) and avoid owning long-term persistence models (handled by `@minimal-rpg/db`, with services calling into repositories when needed).

## Package Connections

- **bus**: Primary dependency; services subscribe/emit via WorldBus
- **schemas**: Shared Zod schemas and domain types for inputs/outputs
- **db**: Persistence for event logs, snapshots, and state when required
- **governor** / **agents**: Producers/consumers of intents and effects
