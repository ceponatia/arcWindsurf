# New World Bus Implementation Plan: The Living Simulation

This document outlines the roadmap for refactoring the ArcAgentic platform from a turn-based chat API into a reactive, event-driven simulation engine.

> **Reference**: See `vision-synthesis-analysis.md` for full comparison of the three vision documents that inform this plan.

---

## 1. Vision & Strategy

Transition from the legacy `Governor`-led orchestration to a **World Bus** architecture where agents are autonomous actors reacting to sensory streams.

### Core Principles

- **No Fallback**: Legacy code that does not support the World Bus architecture will be removed.
- **EDA (Event-Driven Architecture)**: Events are the single source of truth for world state changes.
- **Actor Model**: NPCs are autonomous loops with perception, cognition, and action layers.
- **Hybrid Persistence**: Postgres for hard state, pgvector for semantic memory, Redis for pub/sub and caching.
- **Effect-TS First**: Adopt Effect for error handling, dependency injection, and concurrency across all new code.

### Tech Stack Evolution

| Layer | Current | Target |
|-------|---------|--------|
| **Runtime** | Node.js + TypeScript | Node.js + TypeScript + Effect-TS |
| **ORM** | Raw pg queries | Drizzle ORM |
| **State** | JSON Patch in-memory | Event sourcing + Drizzle projections |
| **Queue** | None | BullMQ + Redis |
| **Pub/Sub** | None | Redis pub/sub or Effect.PubSub |
| **LLM** | OpenRouter only | Provider-agnostic (OpenRouter, Ollama, Anthropic) |
| **Frontend State** | Zustand | @preact/signals + TanStack Query |
| **Real-time** | Polling | SSE + WebSocket |

---

## 2. Package Architecture: Current vs. Target

### Current Packages (13)

```text
packages/
├── agents/        # Domain agents (Map, NPC, Rules)
├── api/           # Hono HTTP server
├── bus/           # EMPTY - placeholder
├── characters/    # Character data loading
├── db/            # Postgres access, raw SQL
├── generator/     # Content generation
├── governor/      # Turn orchestration (LEGACY)
├── retrieval/     # RAG and knowledge
├── schemas/       # Zod schemas
├── state-manager/ # JSON Patch state (LEGACY)
├── ui/            # Shared UI components
├── utils/         # Shared utilities
└── web/           # React frontend
```

### Target Packages (16) — Domain Structure

Below is each package with its `src/` domains. Status indicates: `NEW` (create), `KEEP` (unchanged), `REFACTOR` (modify existing).

---

#### `packages/actors/` — NEW

XState NPC actors with perception/cognition/action loops.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/base/` | NEW | ActorMachine, lifecycle, types |
| `src/npc/` | NEW | NpcMachine, perception, cognition, action, memory |
| `src/player/` | NEW | PlayerMachine (multiplayer-ready) |
| `src/registry/` | NEW | ActorRegistry, spawn/despawn |

---

#### `packages/api/` — REFACTOR

Thin HTTP layer that emits events to WorldBus.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/auth/` | KEEP | JWT, middleware |
| `src/loaders/` | KEEP | Data loaders |
| `src/mappers/` | KEEP | DTO mapping |
| `src/routes/admin/` | REFACTOR | Emit events, not business logic |
| `src/routes/game/` | REFACTOR | Emit events, not business logic |
| `src/routes/resources/` | REFACTOR | Emit events, not business logic |
| `src/routes/system/` | REFACTOR | Emit events, not business logic |
| `src/routes/users/` | REFACTOR | Emit events, not business logic |
| `src/stream/` | NEW | SSE endpoints, WebSocket handlers |
| `src/middleware/` | NEW | Bus integration, telemetry |

---

#### `packages/bus/` — NEW

WorldBus event system (central nervous system).

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/core/` | NEW | WorldBus implementation |
| `src/events/` | NEW | Event type definitions (re-exported from schemas) |
| `src/handlers/` | NEW | IntentHandler, EffectHandler |
| `src/middleware/` | NEW | Logging, telemetry, persistence |
| `src/filters/` | NEW | EventFilter, subscription patterns |
| `src/replay/` | NEW | Time-travel debugging, event replay |

---

#### `packages/characters/` — KEEP

Character data loading (unchanged).

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/appearance/` | KEEP | Visual traits |
| `src/body-map/` | KEEP | Body region mapping |
| `src/hygiene/` | KEEP | Hygiene state |
| `src/personality/` | KEEP | Personality traits |
| `src/profile/` | KEEP | Character profiles |
| `src/utils/` | KEEP | Helpers |

---

#### `packages/db/` — REFACTOR

Replace raw SQL with Drizzle ORM.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/schema/` | NEW | Drizzle table definitions |
| `src/schema/sessions.ts` | NEW | Session table schema |
| `src/schema/events.ts` | NEW | Event log table |
| `src/schema/actors.ts` | NEW | Actor state snapshots |
| `src/schema/projections.ts` | NEW | Materialized state |
| `src/schema/knowledge.ts` | NEW | Knowledge node schema |
| `src/schema/users.ts` | NEW | User table schema |
| `src/repositories/` | REFACTOR | Drizzle query builders |
| `src/repositories/events.ts` | NEW | Event log queries |
| `src/repositories/actors.ts` | NEW | Actor state queries |
| `src/migrations/` | REFACTOR | Drizzle migrations |
| `src/connection/` | KEEP | Pool management |
| `src/vector/` | KEEP | pgvector integration |
| `src/seeds/` | KEEP | Seed data |

---

#### `packages/effects/` — NEW

Effect-TS service layer for DI and error handling.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/layers/` | NEW | DI layers (Database, LLM, Bus, Config) |
| `src/services/` | NEW | Effect-wrapped services (Session, Turn, Actor) |
| `src/errors/` | NEW | Typed domain errors |
| `src/runtime/` | NEW | Effect runtime configuration |

---

#### `packages/generator/` — KEEP

Content generation (unchanged).

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/character/` | KEEP | Character generation |
| `src/item/` | KEEP | Item generation |
| `src/location/` | KEEP | Location generation |
| `src/persona/` | KEEP | Persona generation |
| `src/shared/` | KEEP | Shared generation utils |

---

#### `packages/llm/` — NEW

Provider-agnostic LLM abstraction.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/providers/` | NEW | OpenRouter, Ollama, Anthropic adapters |
| `src/tools/` | NEW | ToolRegistry, executor |
| `src/tools/definitions/` | MIGRATE | Tool definitions (from `governor/tools/`) |
| `src/tools/definitions/core/` | MIGRATE | Core tools |
| `src/tools/definitions/environment/` | MIGRATE | Environment tools |
| `src/tools/definitions/hygiene/` | MIGRATE | Hygiene tools |
| `src/tools/definitions/inventory/` | MIGRATE | Inventory tools |
| `src/tools/definitions/location/` | MIGRATE | Location tools |
| `src/tools/definitions/relationship/` | MIGRATE | Relationship tools |
| `src/tools/definitions/schedule/` | MIGRATE | Schedule tools |
| `src/tools/definitions/time/` | MIGRATE | Time tools |
| `src/cognition/` | NEW | Tiered routing, token budgets |
| `src/streaming/` | NEW | SSE stream handlers |
| `src/prompts/` | NEW | Prompt templates, DSL |

---

#### `packages/projections/` — NEW

Event-to-state reducers.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/reducers/` | NEW | State reducers by domain |
| `src/reducers/session.ts` | NEW | Session state reducer |
| `src/reducers/location.ts` | NEW | Location state reducer |
| `src/reducers/inventory.ts` | NEW | Inventory state reducer |
| `src/reducers/time.ts` | NEW | Time state reducer |
| `src/reducers/npc.ts` | NEW | NPC state reducer |
| `src/reducers/affinity.ts` | NEW | Affinity state reducer |
| `src/projector/` | NEW | Event stream → current state |
| `src/snapshot/` | NEW | Snapshot creation/restoration |
| `src/rebuild/` | NEW | Full state rebuild from events |

---

#### `packages/retrieval/` — REFACTOR

Hybrid BM25 + vector search.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/services/` | KEEP | KnowledgeService |
| `src/extraction/` | KEEP | Entity extraction |
| `src/scoring/` | REFACTOR | Add hybrid scoring |
| `src/bm25/` | NEW | BM25 keyword search |
| `src/reranker/` | NEW | Cross-encoder re-ranking |
| `src/loaders/` | KEEP | Document loaders |
| `src/utils/` | KEEP | Helpers |

---

#### `packages/schemas/` — REFACTOR

Add event, actor, and LLM schemas.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/events/` | NEW | WorldBus event discriminated unions |
| `src/events/intents.ts` | NEW | MOVE_INTENT, SPEAK_INTENT, etc. |
| `src/events/effects.ts` | NEW | MOVED, SPOKE, DAMAGED, etc. |
| `src/events/system.ts` | NEW | TICK, SESSION_START, etc. |
| `src/actors/` | NEW | Actor state machine types |
| `src/actors/npc.ts` | NEW | NPC actor state schema |
| `src/actors/player.ts` | NEW | Player state schema |
| `src/actors/lifecycle.ts` | NEW | Actor lifecycle events |
| `src/llm/` | NEW | LLM types |
| `src/llm/providers.ts` | NEW | Provider config schemas |
| `src/llm/tools.ts` | NEW | Tool definition schemas |
| `src/affinity/` | KEEP | — |
| `src/api/` | KEEP | — |
| `src/body-regions/` | KEEP | — |
| `src/character/` | KEEP | — |
| `src/inventory/` | KEEP | — |
| `src/items/` | KEEP | — |
| `src/location/` | KEEP | — |
| `src/npc-tier/` | KEEP | — |
| `src/persona/` | KEEP | — |
| `src/schedule/` | KEEP | — |
| `src/setting/` | KEEP | — |
| `src/shared/` | KEEP | — |
| `src/simulation/` | REFACTOR | Add tick schemas |
| `src/state/` | REFACTOR | Event-sourced shapes |
| `src/tags/` | KEEP | — |
| `src/time/` | KEEP | — |
| `src/utils/` | KEEP | — |

---

#### `packages/services/` — NEW

Deterministic game rule engines.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/physics/` | NEW | Movement, collision, spatial index |
| `src/physics/physics-engine.ts` | NEW | Core physics |
| `src/physics/spatial-index.ts` | NEW | R-tree for proximity |
| `src/physics/pathfinding.ts` | NEW | A* navigation |
| `src/social/` | NEW | Affinity, reputation, faction |
| `src/social/social-engine.ts` | NEW | Core social logic |
| `src/social/dialogue.ts` | NEW | Conversation state |
| `src/social/faction.ts` | NEW | Faction relationships |
| `src/time/` | NEW | World clock, scheduler |
| `src/time/time-service.ts` | NEW | World clock |
| `src/time/scheduler.ts` | NEW | NPC schedules |
| `src/time/tick-emitter.ts` | NEW | TICK event source |
| `src/location/` | MIGRATE | From `governor/location/` |
| `src/location/location-service.ts` | MIGRATE | Location graph |
| `src/location/exit-resolver.ts` | MIGRATE | Exit navigation |
| `src/rules/` | NEW | Combat, crafting validators |
| `src/rules/rules-engine.ts` | NEW | Rule resolution |
| `src/rules/validators.ts` | NEW | Action validation |
| `src/simulation/` | MIGRATE | From `api/services/` |
| `src/simulation/encounter.ts` | MIGRATE | Encounter logic |
| `src/simulation/hooks.ts` | MIGRATE | Simulation hooks |

---

#### `packages/ui/` — KEEP

Shared UI components (unchanged).

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/components/` | KEEP | Reusable components |
| `src/lib/` | KEEP | Utilities |

---

#### `packages/utils/` — KEEP

Shared utilities (unchanged).

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/character/` | KEEP | — |
| `src/errors/` | KEEP | — |
| `src/forms/` | KEEP | — |
| `src/http/` | KEEP | — |
| `src/llm/` | KEEP | (or merge to llm package) |
| `src/parsers/` | KEEP | — |
| `src/settings/` | KEEP | — |
| `src/shared/` | KEEP | — |

---

#### `packages/web/` — REFACTOR

Real-time UI with signals and SSE.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/features/` | KEEP | Feature modules |
| `src/signals/` | NEW | @preact/signals state |
| `src/signals/session.ts` | NEW | Session signals |
| `src/signals/events.ts` | NEW | Event stream signals |
| `src/signals/actors.ts` | NEW | Actor signals |
| `src/signals/ui.ts` | NEW | UI state signals |
| `src/hooks/` | REFACTOR | Add event stream hooks |
| `src/hooks/useWorldBus.ts` | NEW | SSE connection |
| `src/hooks/useSignal.ts` | NEW | Signal bindings |
| `src/components/` | NEW | Promote from features |
| `src/components/DevOverlay.tsx` | NEW | Debug overlay |
| `src/layouts/` | KEEP | — |
| `src/shared/` | KEEP | — |
| `src/styles/` | KEEP | — |

---

#### `packages/workers/` — NEW

BullMQ background job processing.

| Domain | Status | Purpose |
|--------|--------|---------|
| `src/queues/` | NEW | Queue definitions |
| `src/queues/tick.ts` | NEW | Simulation tick queue |
| `src/queues/cognition.ts` | NEW | NPC thinking queue |
| `src/queues/embedding.ts` | NEW | Memory embedding queue |
| `src/processors/` | NEW | Job processors |
| `src/processors/tick-processor.ts` | NEW | Process TICK events |
| `src/processors/cognition-processor.ts` | NEW | Process NPC thoughts |
| `src/processors/embed-processor.ts` | NEW | Generate embeddings |
| `src/scheduler/` | NEW | Cron-like scheduling |

---

## 3. Packages to REMOVE

### `packages/governor/` → REMOVE ENTIRELY

**Reason**: The Governor pattern is fundamentally request/response. The World Bus replaces it with event-driven processing.

| File | Current Role | Migration Target |
|------|--------------|------------------|
| `src/core/governor.ts` | Turn orchestration | `@minimal-rpg/bus` EventProcessor |
| `src/core/npc-turn-handler.ts` | NPC turn logic | `@minimal-rpg/actors` NpcActor |
| `src/core/npc-evaluator.ts` | NPC evaluation | `@minimal-rpg/actors` CognitionLayer |
| `src/core/action-sequencer.ts` | Action sequencing | `@minimal-rpg/services` PhysicsEngine |
| `src/core/types.ts` | Turn types | `@minimal-rpg/schemas` EventTypes |
| `src/tools/` (all 19 files) | LLM tool definitions | `@minimal-rpg/llm` ToolRegistry |
| `src/location/` | Location graph | `@minimal-rpg/services` LocationService |
| `src/proximity/` | Proximity tracking | `@minimal-rpg/services` SpatialService |
| `src/intents/` | Intent parsing | `@minimal-rpg/bus` IntentEvents |
| `src/factories/` | Governor factory | `@minimal-rpg/effects` ServiceFactory |
| `src/utils/` | Equipment utils | `@minimal-rpg/schemas` EquipmentUtils |

**Migration Strategy**:

1. Extract tool definitions to `@minimal-rpg/llm`
2. Extract location logic to `@minimal-rpg/services`
3. Extract types to `@minimal-rpg/schemas`
4. Delete package after all consumers migrated

---

### `packages/state-manager/` → REMOVE ENTIRELY

**Reason**: JSON Patch is ephemeral. Event sourcing with Drizzle projections replaces it.

| File | Current Role | Migration Target |
|------|--------------|------------------|
| `src/manager.ts` | State merge/diff/apply | `@minimal-rpg/projections` StateProjector |
| `src/types.ts` | Patch/slice types | `@minimal-rpg/schemas` StateTypes |
| `src/utils.ts` | Deep merge/clone | `@minimal-rpg/utils` (already exists) |
| `src/proximity/` | Proximity service | `@minimal-rpg/services` SpatialService |

**Migration Strategy**:

1. Move `ProximityService` to `@minimal-rpg/services`
2. Move utility functions to `@minimal-rpg/utils`
3. Create `@minimal-rpg/projections` with event reducers
4. Delete package

---

### `packages/agents/` → REMOVE, REPLACE WITH `packages/actors/`

**Reason**: The BaseAgent pattern is prompt/response. Actors are autonomous state machines.

| File | Current Role | Migration Target |
|------|--------------|------------------|
| `src/core/base.ts` | BaseAgent class | `@minimal-rpg/actors` ActorBase (XState) |
| `src/core/registry.ts` | Agent registry | `@minimal-rpg/actors` ActorRegistry |
| `src/core/types.ts` | Agent interfaces | `@minimal-rpg/schemas` ActorTypes |
| `src/npc/` (17 files) | NPC agent | `@minimal-rpg/actors` NpcActor |
| `src/map/` | Map agent | `@minimal-rpg/services` SpatialService |
| `src/rules/` | Rules agent | `@minimal-rpg/services` RulesEngine |
| `src/sensory/` (7 files) | Sensory service | `@minimal-rpg/actors` PerceptionLayer |

**Migration Strategy**:

1. Create `@minimal-rpg/actors` with XState machine definitions
2. Port NpcAgent logic to NpcActor perception/cognition/action layers
3. Move SensoryService to actors package
4. Delete `packages/agents/`

---

## 4. Packages to REFACTOR

### `packages/api/src/` → Thin HTTP Layer

**Goal**: API becomes a thin adapter between HTTP and the WorldBus.

| Directory | Current State | Target State |
|-----------|---------------|--------------|
| `routes/` (37 files) | Business logic in handlers | Handlers emit events to bus |
| `services/` (12 files) | Mixed concerns | Move to `@minimal-rpg/effects` |
| `game/tools/` | Tool execution | Move to `@minimal-rpg/llm` |
| `db/` | Direct DB access | Use Drizzle repositories |
| `loaders/` | Data loading | Keep, use Drizzle |
| `mappers/` | DTO mapping | Keep, refine |

**Files to Alter**:

| File | Change |
|------|--------|
| `src/server-impl.ts` | Add WorldBus middleware, SSE endpoints |
| `src/routes/sessions.ts` | Emit `SESSION_CREATED` event |
| `src/routes/turns.ts` | Replace Governor call with bus event |
| `src/services/` (all) | Extract to `@minimal-rpg/effects` |

---

### `packages/db/src/` → Drizzle ORM

**Goal**: Replace raw SQL with type-safe Drizzle queries.

| Directory | Current State | Target State |
|-----------|---------------|--------------|
| `repositories/` | Raw pg queries | Drizzle query builders |
| `migrations/` | SQL files | Drizzle migrations |
| `vector/` | pgvector setup | Keep, integrate with Drizzle |
| `types.ts` | Manual types | Infer from Drizzle schema |

**New Files Needed**:

| File | Purpose |
|------|---------|
| `src/schema/index.ts` | Drizzle schema definitions |
| `src/schema/sessions.ts` | Session table schema |
| `src/schema/events.ts` | Event log table schema |
| `src/schema/actors.ts` | Actor state table schema |
| `src/schema/knowledge.ts` | Knowledge node schema |
| `drizzle.config.ts` | Drizzle configuration |

**Files to Remove**:

| File | Reason |
|------|--------|
| `src/types.ts` | Replace with Drizzle inferred types |

---

### `packages/schemas/src/` → Event + Domain Schemas

**Goal**: Add event schemas, refine existing domain schemas.

**New Domains to Add**:

| Directory | Purpose |
|-----------|---------|
| `src/events/` | WorldBus event discriminated unions |
| `src/events/intents.ts` | Intent events (MOVE_INTENT, SPEAK_INTENT) |
| `src/events/effects.ts` | Effect events (MOVED, SPOKE, DAMAGED) |
| `src/events/system.ts` | System events (TICK, SESSION_START) |
| `src/actors/` | Actor state machine types |
| `src/actors/npc.ts` | NPC actor state schema |
| `src/actors/lifecycle.ts` | Actor lifecycle events |
| `src/llm/` | LLM provider types |
| `src/llm/providers.ts` | Provider config schemas |
| `src/llm/tools.ts` | Tool definition schemas |

**Files to Alter**:

| File | Change |
|------|--------|
| `src/state/` | Add event-sourced state shapes |
| `src/simulation/` | Add simulation tick schemas |
| `src/index.ts` | Export new domains |

---

### `packages/retrieval/src/` → Hybrid BM25 + Vector

**Goal**: Combine keyword and semantic search with re-ranking.

**Files to Alter**:

| File | Change |
|------|--------|
| `src/services/knowledge-service.ts` | Add BM25 search path |
| `src/scoring/` | Add hybrid re-ranker |
| `src/types.ts` | Add HybridSearchResult type |

**New Files**:

| File | Purpose |
|------|---------|
| `src/bm25/index.ts` | BM25 search implementation |
| `src/reranker/index.ts` | Cross-encoder re-ranking |

---

### `packages/web/src/` → Signals + SSE

**Goal**: Replace polling with real-time event streaming.

**Major Changes**:

| Area | Current | Target |
|------|---------|--------|
| State | Zustand stores | @preact/signals + TanStack Query |
| Updates | Polling/manual refresh | SSE EventSource |
| Components | Props drilling | Signal subscriptions |

**Files to Alter**:

| File | Change |
|------|--------|
| `src/stores/` | Replace Zustand with signals |
| `src/hooks/` | Add useEventStream hooks |
| `src/components/` | Subscribe to signals |
| `src/pages/` | Add SSE connection setup |

**New Files**:

| File | Purpose |
|------|---------|
| `src/signals/session.ts` | Session state signals |
| `src/signals/events.ts` | Event stream signals |
| `src/hooks/useWorldBus.ts` | SSE connection hook |
| `src/components/DevOverlay.tsx` | Debug overlay |

---

## 5. Key Interfaces (TypeScript)

This section provides key TypeScript interfaces for the new packages. Domain structure is defined in Section 2.

### WorldBus (`@minimal-rpg/bus`)

```typescript
// Event discriminated union
type WorldEvent =
  | { type: 'INTENT'; intent: Intent }
  | { type: 'EFFECT'; effect: Effect }
  | { type: 'TICK'; tick: number; timestamp: Date }
  | { type: 'SYSTEM'; system: SystemEvent };

// WorldBus interface
interface WorldBus {
  emit(event: WorldEvent): Promise<void>;
  subscribe(filter: EventFilter, handler: EventHandler): Unsubscribe;
  replay(from: Date, to: Date): AsyncIterable<WorldEvent>;
}

// Event filter for subscriptions
interface EventFilter {
  types?: WorldEvent['type'][];
  actorId?: string;
  sessionId?: string;
}
```

### NPC Actor (`@minimal-rpg/actors`)

```typescript
// NPC Actor states (XState)
type NpcState =
  | { value: 'idle' }
  | { value: 'perceiving'; events: WorldEvent[] }
  | { value: 'thinking'; context: CognitionContext }
  | { value: 'acting'; intent: Intent }
  | { value: 'waiting'; until: Date };

// Actor lifecycle
interface Actor {
  id: string;
  type: 'npc' | 'player' | 'system';
  state: NpcState;
  start(): void;
  stop(): void;
  send(event: WorldEvent): void;
}
```

### LLM Provider (`@minimal-rpg/llm`)

```typescript
// Provider-agnostic interface
interface LLMProvider {
  id: string;
  chat(messages: Message[], options?: ChatOptions): Promise<Response>;
  stream(messages: Message[], options?: ChatOptions): AsyncIterable<Chunk>;
  supportsTools: boolean;
  supportsFunctions: boolean;
}

// Tiered cognition routing
interface CognitionRouter {
  route(task: CognitionTask): LLMProvider;
  // Returns fast model (gpt-4o-mini) for simple tasks
  // Returns deep model (claude-3.5) for complex tasks
}

// Token budget
interface TokenBudget {
  sessionId: string;
  limit: number;
  used: number;
  remaining: number;
}
```

### Projection Reducer (`@minimal-rpg/projections`)

```typescript
// Event reducer pattern
type Reducer<S> = (state: S, event: WorldEvent) => S;

// Projector interface
interface Projector<S> {
  getState(sessionId: string): Promise<S>;
  applyEvent(sessionId: string, event: WorldEvent): Promise<S>;
  rebuild(sessionId: string, fromSeq?: number): Promise<S>;
  snapshot(sessionId: string): Promise<void>;
}
```

### System Service (`@minimal-rpg/services`)

```typescript
// Service pattern: subscribe to intents, emit effects
interface SystemService {
  name: string;
  subscribesTo: WorldEvent['type'][];
  handle(event: WorldEvent, context: ServiceContext): Promise<WorldEvent[]>;
}

// Example: PhysicsEngine
// subscribesTo: ['MOVE_INTENT']
// emits: ['MOVED'] or ['COLLIDED']
```

### Effect Layer (`@minimal-rpg/effects`)

```typescript
// Effect-TS service layer
import { Effect, Layer, Context } from 'effect';

// Service tag
class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  { query: <T>(sql: string) => Effect.Effect<T, DatabaseError> }
>() {}

// Layer composition
const AppLayer = Layer.mergeAll(
  DatabaseLayer,
  LLMLayer,
  BusLayer,
  ConfigLayer
);
```

---

## 6. Database Schema Changes

### New Tables

```sql
-- Event log (append-only)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  actor_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sequence BIGINT NOT NULL
);

CREATE INDEX idx_events_session_seq ON events(session_id, sequence);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_actor ON events(actor_id);

-- Actor state (current snapshot)
CREATE TABLE actor_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  actor_type TEXT NOT NULL, -- 'npc', 'player', 'system'
  actor_id TEXT NOT NULL,   -- e.g., 'barkeep', 'player_1'
  state JSONB NOT NULL,     -- XState persisted state
  last_event_seq BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, actor_id)
);

-- Session projections (materialized state)
CREATE TABLE session_projections (
  session_id UUID PRIMARY KEY REFERENCES sessions(id),
  location JSONB NOT NULL,
  inventory JSONB NOT NULL,
  time JSONB NOT NULL,
  npcs JSONB NOT NULL,
  last_event_seq BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tables to Alter

| Table | Change |
|-------|--------|
| `sessions` | Add `event_seq` counter |
| `messages` | Deprecate in favor of events table |
| `knowledge_nodes` | Add `embedding` column (pgvector) |

---

## 7. Implementation Phases

### Phase 1: Foundation + Redis (Weeks 1-3)

**Goal**: WorldBus with Redis pub/sub + Event schemas + Drizzle setup.

| Task | Package | Files |
|------|---------|-------|
| Initialize `@minimal-rpg/bus` | bus/ | All new |
| **Set up Redis infrastructure** | bus/ | `src/core/redis-client.ts` |
| **Implement Redis pub/sub adapter** | bus/ | `src/adapters/redis-pubsub.ts` |
| **Add session state caching** | db/ | `src/cache/session-cache.ts` |
| Define event discriminated unions | schemas/ | `src/events/` |
| Set up Drizzle ORM | db/ | `drizzle.config.ts`, `src/schema/` |
| Create events table | db/ | `src/schema/events.ts` |
| Add OpenTelemetry middleware | bus/ | `src/middleware/telemetry.ts` |
| **Add SSE endpoint (basic)** | api/ | `src/routes/stream.ts` |

**Deliverable**: Events emitted via Redis pub/sub, persisted to Postgres, streamed to clients via SSE.

**Why front-load Redis**:

- Enables horizontal scaling from day one
- Pub/sub is the backbone of WorldBus—in-memory limits to single instance
- Session caching reduces DB load during actor processing
- SSE streaming needs pub/sub to fan out events to multiple clients

---

### Phase 2: System Services (Weeks 4-6)

**Goal**: Extract physics, social, time into services.

| Task | Package | Files |
|------|---------|-------|
| Create `@minimal-rpg/services` | services/ | All new |
| Migrate LocationGraphService | services/ | `src/location/` |
| Migrate ProximityService | services/ | `src/physics/` |
| Create TimeService with TICK | services/ | `src/time/` |
| Wire services to WorldBus | services/ | Subscribe to intents |

**Deliverable**: Intents emit, services validate, effects return.

---

### Phase 3: Actor Model (Weeks 7-10)

**Goal**: NPC actors with perception/cognition/action.

| Task | Package | Files |
|------|---------|-------|
| Create `@minimal-rpg/actors` | actors/ | All new |
| Define NPC XState machine | actors/ | `src/npc/npc-machine.ts` |
| Implement perception layer | actors/ | `src/npc/perception.ts` |
| Implement cognition layer | actors/ | `src/npc/cognition.ts` |
| Connect actors to WorldBus | actors/ | Subscribe to relevant events |

**Deliverable**: NPCs perceive events, think, and emit intents.

---

### Phase 4: LLM Abstraction (Weeks 11-13)

**Goal**: Provider-agnostic LLM with tiered cognition.

| Task | Package | Files |
|------|---------|-------|
| Create `@minimal-rpg/llm` | llm/ | All new |
| Migrate tool definitions | llm/ | `src/tools/definitions/` |
| Implement tiered routing | llm/ | `src/cognition/tiered.ts` |
| Add token budgets | llm/ | `src/cognition/budget.ts` |
| Add streaming support | llm/ | `src/streaming/` |

**Deliverable**: Cognition can use fast or deep models.

---

### Phase 5: Projections & State (Weeks 14-16)

**Goal**: Event-sourced state with projections.

| Task | Package | Files |
|------|---------|-------|
| Create `@minimal-rpg/projections` | projections/ | All new |
| Implement session reducer | projections/ | `src/reducers/session.ts` |
| Implement snapshot management | projections/ | `src/snapshot.ts` |
| Delete `@minimal-rpg/state-manager` | state-manager/ | Remove package |
| Migrate API to projections | api/ | Update services |

**Deliverable**: State derived from events, not patches.

---

### Phase 6: Background Workers (Weeks 17-18)

**Goal**: Simulation ticks via BullMQ (builds on Redis from Phase 1).

| Task | Package | Files |
|------|---------|-------|
| Create `@minimal-rpg/workers` | workers/ | All new |
| Add BullMQ queues (Redis already available) | workers/ | `src/queues/` |
| Implement tick processor | workers/ | `src/processors/tick-processor.ts` |
| Implement cognition queue | workers/ | `src/processors/cognition-processor.ts` |
| Schedule NPC heartbeat | workers/ | `src/scheduler.ts` |

**Deliverable**: NPCs think and act without player input.

**Note**: Redis infrastructure from Phase 1 makes this phase faster—only queue definitions and processors needed.

---

### Phase 7: Frontend Reactivity (Weeks 19-21)

**Goal**: Full real-time UI with signals (SSE endpoint already exists from Phase 1).

| Task | Package | Files |
|------|---------|-------|
| Replace Zustand with signals | web/ | `src/signals/` |
| Implement useWorldBus hook | web/ | `src/hooks/useWorldBus.ts` |
| Add dev overlay | web/ | `src/components/DevOverlay.tsx` |
| Enhance SSE with reconnection/backpressure | api/ | `src/routes/stream.ts` |

**Deliverable**: UI updates in real-time without polling.

**Note**: Basic SSE from Phase 1 is enhanced here with production-grade features.

---

### Phase 8: Cleanup (Weeks 22-24)

**Goal**: Remove legacy packages, stabilize.

| Task | Package | Files |
|------|---------|-------|
| Delete `@minimal-rpg/governor` | governor/ | Remove entire package |
| Delete `@minimal-rpg/agents` | agents/ | Remove entire package |
| Update all imports | All | Barrel exports |
| Final integration tests | All | Test coverage |

**Deliverable**: Clean, event-driven architecture.

---

## 8. Package Dependencies

Packages are layered by dependency depth. A package may only import from layers below it.

| Layer | Package | Imports | Imported By |
|-------|---------|---------|-------------|
| 0 | `@minimal-rpg/schemas` | (none) | all packages |
| 1 | `@minimal-rpg/bus` | schemas | services, actors, effects, api, workers |
| 1 | `@minimal-rpg/llm` | schemas | actors, effects, api |
| 1 | `@minimal-rpg/db` | schemas | services, projections, effects, api, workers |
| 2 | `@minimal-rpg/services` | schemas, bus, db | actors, projections, effects |
| 3 | `@minimal-rpg/actors` | schemas, bus, llm, services | effects, workers |
| 3 | `@minimal-rpg/projections` | schemas, db, services | effects, api |
| 4 | `@minimal-rpg/effects` | schemas, bus, llm, db, services, actors, projections | api, workers |
| 5 | `@minimal-rpg/api` | schemas, bus, llm, db, projections, effects | web |
| 5 | `@minimal-rpg/workers` | schemas, bus, db, actors, effects | (none) |
| 6 | `@minimal-rpg/web` | schemas, api | (none) |

### Standalone Packages (unchanged from current)

| Package | Imports | Imported By |
|---------|---------|-------------|
| `@minimal-rpg/characters` | schemas | actors, generator |
| `@minimal-rpg/generator` | schemas, characters | api |
| `@minimal-rpg/retrieval` | schemas, db | actors, api |
| `@minimal-rpg/utils` | schemas | all packages |
| `@minimal-rpg/ui` | (none) | web |

---

## 9. Risk Mitigations

| Risk | Mitigation |
|------|------------|
| XState complexity | Begin with single NPC; expand after validation |
| Event log size | Partition by session + month; TTL for old sessions |
| Real-time performance | Use Redis pub/sub; benchmark early |
| LLM costs | Implement tiered cognition and token budgets first |
