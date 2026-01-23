# @minimal-rpg/projections

## Purpose

Event-sourced read models ("projections") for a game session.

This package replays persisted `WorldEvent`s from `@minimal-rpg/db` into in-memory state using pure reducers, and can persist the resulting state back into the database as snapshots for faster startup.

## Core Responsibilities

- **Projection definitions**: Typed `Projection<S>` objects: `{ name, reducer, initialState }`.
- **Event replay**: `Projector<S>` loads the last snapshot and replays new events from the `events` table.
- **Session orchestration**: `ProjectionManager` bundles multiple projectors for a single `sessionId`.
- **Snapshot persistence**: `saveProjectionState()` writes per-session snapshot JSON into `session_projections`.
- **Generic patch projection**: `patchReducer` applies JSON patches for projection domains that are stored as arbitrary JSON objects.

## How It Is Used

Typical server-side flow (see `@minimal-rpg/api`):

```ts
import { ProjectionManager } from '@minimal-rpg/projections';

const manager = new ProjectionManager(sessionId);
await manager.init(); // loads snapshots + replays missing events

const state = manager.getState();
// state.session / state.location / state.npcs / state.inventory / state.time

await manager.saveSnapshots();
```

When you already have an in-memory projector and receive a new event with a known sequence (e.g. streamed from a bus), you can do a live update without re-querying the DB:

```ts
projector.applyEvent(event, sequence);
```

## Public API (Imports/Exports)

Entry point: `src/index.ts` exports:

- **Core types** (from `src/types.ts`)
  - `Reducer<S>`
  - `Projection<S>`
  - `ReplayOptions`
  - `SnapshotHeader`, `EventBatch`
  - `StateChangeSource`, `StateSnapshot<T>`
- **Classes**
  - `Projector<S>` (from `src/projector.ts`)
  - `ProjectionManager` (from `src/manager.ts`)
- **Projection definitions / reducers** (from `src/reducers/*`)
  - `sessionProjection`, `locationProjection`, `npcProjection`
  - `initialSessionState`, `initialLocationsState`, `initialNpcsState`
  - `SessionState`, `LocationsState`, `NpcsState` (and related state interfaces)
  - `patchReducer`
  - `allProjections` (a convenience registry)
- **Snapshot persistence**
  - `saveProjectionState` (from `src/snapshot/store.ts`)
- **Convenience factory**
  - `createSessionProjectors(sessionId: string)`

## Key Classes and Interfaces

- `Projector<S>`
  - Holds `currentState` and `lastSequence`.
  - `loadSnapshot()` reads a row from `session_projections`.
  - `replay()` reads events from `events` ordered by `sequence`, validates each payload with `WorldEventSchema`, and applies the domain reducer.
  - `applyEvent()` applies one event in-memory only (no persistence).

- `ProjectionManager`
  - Creates and owns one `Projector` per domain for a session (currently: `session`, `location`, `npcs`, plus generic `inventory` and `time`).
  - `init()` loads snapshots and replays events for every projector.
  - `saveSnapshots()` persists each domain state using `saveProjectionState()`.
  - `getState()` returns a combined object for response payloads.

- `Projection<S>` (interface)
  - `name`: domain identifier used for snapshot column mapping.
  - `reducer`: pure function `(state, event) => nextState`.
  - `initialState`: used when no snapshot exists.

## Database Integration

This package assumes:

- `events` table stores an append-only event stream per session (`sessionId`, `sequence`, `payload`, ...).
- `session_projections` stores snapshot JSON blobs and the last processed event sequence (`lastEventSeq`).

Projection snapshots are persisted via `saveProjectionState()`; because `session_projections` uses fixed columns, adding a new projection domain typically requires:

1. Add a new reducer/projection in `src/reducers/`.
2. Export it from `src/reducers/index.ts`.
3. Add a `Projector` to `ProjectionManager`.
4. Add or map a snapshot column in `@minimal-rpg/db` (`session_projections`) and update `src/snapshot/store.ts` mapping.

## Package Connections

- **@minimal-rpg/db**: Reads from `events` and reads/writes `session_projections` (Drizzle).
- **@minimal-rpg/schemas**: Uses `WorldEventSchema`/`WorldEvent` and shared helpers (`getRecordOptional`, `setRecord`, NPC location defaults).
- **@minimal-rpg/api**: Uses `ProjectionManager` to provide read-model state to routes/services.
- **fast-json-patch**: Used by the `patchReducer` for generic JSON state domains.
