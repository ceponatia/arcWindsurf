# Phase 3: Actor Model - COMPLETE ✅

## Implementation Summary

Phase 3 has been successfully implemented, delivering autonomous NPC actors with perception, cognition, and action loops using XState state machines integrated with the WorldBus architecture.

## Deliverables ✅

### 1. Created `@minimal-rpg/actors` Package

**Status**: ✅ Complete

Package structure:

```text
packages/actors/
├── src/
│   ├── base/               # Actor interfaces and lifecycle
│   │   ├── types.ts        # Actor, ActorConfig, ActorFactory
│   │   ├── lifecycle.ts    # BaseActorLifecycle (WorldBus subscription)
│   │   └── index.ts
│   ├── npc/                # NPC-specific implementation
│   │   ├── types.ts        # NPC state, contexts
│   │   ├── perception.ts   # PerceptionLayer (event filtering)
│   │   ├── cognition.ts    # CognitionLayer (decision-making)
│   │   ├── npc-machine.ts  # XState machine definition
│   │   ├── npc-actor.ts    # NpcActor implementation
│   │   └── index.ts
│   ├── player/             # Player actors (stub for Phase 3)
│   │   ├── player-actor.ts # PlayerActor (multiplayer-ready)
│   │   └── index.ts
│   └── registry/           # Actor management
│       ├── actor-registry.ts # ActorRegistry (spawn/despawn)
│       └── index.ts
├── test/
│   └── npc-actor.test.ts   # Comprehensive tests (8 passing)
├── package.json            # Dependencies (xstate: ^5.18.2)
├── tsconfig.json
├── AGENTS.md               # Package architecture documentation
└── README.md               # Usage guide
```

### 2. Defined NPC XState Machine

**Status**: ✅ Complete

**File**: [packages/actors/src/npc/npc-machine.ts](packages/actors/src/npc/npc-machine.ts)

State machine flow:

```text
idle → perceiving → thinking → acting → waiting → idle
```

States:
- **idle**: Waiting for WORLD_EVENT
- **perceiving**: Filter relevant events, build perception context
- **thinking**: Decide on actions using cognition layer
- **acting**: Emit intent to WorldBus
- **waiting**: 500ms cooldown before returning to idle

### 3. Implemented Perception Layer

**Status**: ✅ Complete

**File**: [packages/actors/src/npc/perception.ts](packages/actors/src/npc/perception.ts)

Capabilities:
- **filterRelevantEvents**: Filter events by session, location, actor ID
- **isRelevant**: Check if event is relevant to NPC (location-based, actor-specific)
- **buildContext**: Create PerceptionContext with nearby actors
- **summarize**: Generate perception summaries for debugging

Filtering logic:
- Session-scoped: Ignore events from different sessions
- Location-based: Only perceive events in current location (except TICK/system events)
- Actor-targeted: Process events addressed to this NPC

### 4. Implemented Cognition Layer

**Status**: ✅ Complete

**File**: [packages/actors/src/npc/cognition.ts](packages/actors/src/npc/cognition.ts)

Decision-making (Phase 3 - rule-based):
- **decideSync**: Synchronous cognition using simple rules
  - Respond to SPOKE events (reply to speech)
  - Acknowledge MOVED events (notice arrivals)
- **decide**: Async version (calls decideSync for Phase 3, prepared for LLM in Phase 4)
- **shouldAct**: Determine if NPC should act
- **summarizeDecision**: Log decision outcomes

Rule-based logic:
1. If someone spoke, emit SPEAK_INTENT with response
2. If someone moved into location, emit SPEAK_INTENT acknowledging arrival
3. Otherwise, return null (idle)

**Note**: Phase 4 will replace `decideSync` with LLM-based cognition.

### 5. Connected Actors to WorldBus

**Status**: ✅ Complete

**Integration Points**:

1. **BaseActorLifecycle** ([packages/actors/src/base/lifecycle.ts](packages/actors/src/base/lifecycle.ts))
   - Subscribes to WorldBus on `start()`
   - Unsubscribes on `stop()`
   - Routes events to actor's `send()` method

2. **NpcActor** ([packages/actors/src/npc/npc-actor.ts](packages/actors/src/npc/npc-actor.ts))
   - Receives events via `send(event: WorldEvent)`
   - Sends `WORLD_EVENT` to XState machine
   - Machine emits intents back to WorldBus via `worldBus.emit()`

3. **ActorRegistry** ([packages/actors/src/registry/actor-registry.ts](packages/actors/src/registry/actor-registry.ts))
   - Spawns actors and calls `start()` automatically
   - Emits `ACTOR_SPAWN` events to WorldBus
   - Emits `ACTOR_DESPAWN` events on cleanup
   - Session-scoped management (`getForSession`, `despawnSession`)

Event flow:

```text
WorldBus → Actor.send() → XState Machine → Perception → Cognition → Action → WorldBus
```

## Test Coverage ✅

**File**: [packages/actors/test/npc-actor.test.ts](packages/actors/test/npc-actor.test.ts)

Tests passing: **8/8**

Coverage:
- ✅ NPC actor creation
- ✅ Start/stop lifecycle
- ✅ Event reception
- ✅ Snapshot retrieval
- ✅ Actor registry spawn
- ✅ Actor registry despawn
- ✅ Session-scoped actor lookup
- ✅ Session cleanup (despawnSession)

## Package Dependencies ✅

**Layer 3**: `@minimal-rpg/actors`

Depends on:
- `@minimal-rpg/bus` (WorldBus integration)
- `@minimal-rpg/schemas` (Event types, state schemas)
- `@minimal-rpg/services` (Future: Query world state)
- `xstate` v5.18.2 (State machine library)

Consumed by (Phase 4+):
- `@minimal-rpg/effects` (Service factory)
- `@minimal-rpg/workers` (Background processing)

## Key Interfaces Implemented

### Actor

```typescript
interface Actor {
  readonly id: string;
  readonly type: ActorType;
  readonly sessionId: string;
  start(): void;
  stop(): void;
  send(event: WorldEvent): void;
  getSnapshot(): BaseActorState;
}
```

### NpcMachineContext

```typescript
interface NpcMachineContext {
  actorId: string;
  npcId: string;
  sessionId: string;
  locationId: string;
  recentEvents: WorldEvent[];
  perception?: PerceptionContext;
  pendingIntent?: WorldEvent;
}
```

### PerceptionContext

```typescript
interface PerceptionContext {
  relevantEvents: WorldEvent[];
  nearbyActors: string[];
  locationState?: unknown;
}
```

### CognitionContext

```typescript
interface CognitionContext {
  perception: PerceptionContext;
  state: NpcActorState;
  availableActions: string[];
}
```

### ActionResult

```typescript
interface ActionResult {
  intent: WorldEvent;
  delayMs?: number;
}
```

## Usage Example

```typescript
import { actorRegistry } from '@minimal-rpg/actors';

// Spawn an NPC actor
const barkeep = actorRegistry.spawn({
  id: 'barkeep-1',
  type: 'npc',
  npcId: 'barkeep',
  sessionId: 'session-123',
  locationId: 'tavern',
});

// Actor automatically:
// 1. Subscribes to WorldBus
// 2. Filters relevant events
// 3. Makes decisions
// 4. Emits intents

// Despawn when done
actorRegistry.despawn('barkeep-1');

// Or despawn all actors for a session
actorRegistry.despawnSession('session-123');
```

## Architecture Highlights

1. **Autonomous Loops**: NPCs operate independently without external orchestration
2. **Event-Driven**: All interactions happen via WorldBus events
3. **XState Integration**: State machines provide predictable, testable behavior
4. **Perception Filtering**: NPCs only process relevant events (session, location)
5. **Synchronous Cognition**: Phase 3 uses simple rules; Phase 4 will add LLM
6. **Registry Pattern**: Centralized actor lifecycle management
7. **Session Scoping**: Actors can be managed per-session

## Phase 3 vs Phase 4 Roadmap

| Feature | Phase 3 (Current) | Phase 4 (Next) |
|---------|-------------------|----------------|
| Cognition | Rule-based (synchronous) | LLM-based (OpenRouter, Ollama, Anthropic) |
| Decision Speed | Instant | Token budget + tiered routing |
| Action Variety | SPEAK_INTENT only | Full action set (move, use items, etc.) |
| Memory | Recent events (last 10) | Long-term memory via embeddings |
| Tools | None | Tool registry from `@minimal-rpg/llm` |
| Streaming | N/A | SSE streaming for LLM responses |

## Next Steps (Phase 4)

1. Create `@minimal-rpg/llm` package
   - Provider adapters (OpenRouter, Ollama, Anthropic)
   - Tool registry and execution
   - Tiered cognition routing
   - Token budgets

2. Enhance NpcActor cognition
   - Replace `CognitionLayer.decideSync` with LLM calls
   - Use invoke for async LLM requests in XState machine
   - Add tool execution layer

3. Migrate tool definitions from `@minimal-rpg/governor`
   - Move to `@minimal-rpg/llm/src/tools/definitions/`
   - Update ToolRegistry

4. Test LLM-based decision making
   - Add integration tests with LLM providers
   - Validate token budget enforcement

## Validation ✅

- ✅ TypeScript compilation: No errors
- ✅ All tests passing: 8/8
- ✅ Package builds successfully
- ✅ WorldBus integration working
- ✅ Actor lifecycle management functional
- ✅ Documentation complete (AGENTS.md, README.md)

## System Status

**Phase 1**: ✅ Complete (WorldBus, Redis, Events, Drizzle, SSE)
**Phase 2**: ✅ Complete (System Services)
**Phase 3**: ✅ Complete (Actor Model) ← YOU ARE HERE
**Phase 4**: 🔲 Pending (LLM Abstraction)

The actor model is fully operational and ready for Phase 4 LLM integration!
