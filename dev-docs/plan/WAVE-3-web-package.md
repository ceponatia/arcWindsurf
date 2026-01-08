# Web Package Refactor Plan: Real-Time Game Experience

This document outlines the roadmap for transforming the `@minimal-rpg/web` package from a legacy form-based UI into a reactive, event-driven game client that integrates with the World Bus architecture.

---

## 1. Current State Analysis

### Existing Structure

```text
packages/web/src/
├── App.tsx                    # Router shell
├── config.ts                  # API configuration
├── main.tsx                   # Entry point
├── types.ts                   # Shared types
├── features/                  # Feature modules (168 items)
│   ├── character-builder/     # REFERENCE: Level of detail we want
│   ├── setting-builder/       # Setting creation
│   ├── session-builder/       # Session creation
│   ├── session-workspace/     # Current game UI (LEGACY)
│   ├── location-builder/      # Location editor
│   ├── prefab-builder/        # Location prefabs
│   ├── persona-builder/       # Persona profiles
│   ├── item-builder/          # Item creation
│   ├── tag-builder/           # Prompt tag editor
│   ├── library/               # Asset library
│   ├── chat/                   # Chat interface
│   ├── game/                   # Minimal game components
│   └── ...panels/             # Various selection panels
├── hooks/                     # React hooks (6 files)
├── layouts/                   # Page layouts
├── shared/                    # Shared components/api
├── signals/                   # NEW: @preact/signals state
│   ├── actors.ts              # Actor state signals
│   ├── events.ts              # Event stream signals
│   ├── session.ts             # Session signals
│   └── ui.ts                  # UI state signals
├── services/                  # API services
└── styles/                    # Global styles
```

### What Works Well (Keep)

1. **Character Builder** (`features/character-builder/`)
   - Comprehensive personality system (Big Five + facets)
   - Body map with sensory data (scent, texture, flavor)
   - Appearance regions with detailed attributes
   - Trait conflict detection
   - Mode-based complexity (quick/standard/advanced)
   - This is our **reference implementation** for entity detail

2. **Schema Integration**
   - Strong Zod validation
   - Type-safe form handling
   - Transformers for API ↔ Form state

3. **Signals Foundation** (`signals/`)
   - Already scaffolded for actors, events, session, ui
   - Ready for World Bus integration

### What Needs Replacement (Legacy)

1. **Session Workspace** - Polling-based, not event-driven
2. **Chat Interface** - Request/response, not streaming
3. **Game Components** - Not connected to World Bus
4. **API Communication** - REST calls, not SSE/WebSocket

---

## 2. Target Architecture

### New Structure

```text
packages/web/src/
├── App.tsx
├── config.ts
├── main.tsx
├── types.ts
│
├── signals/                   # ENHANCED: World Bus integration
│   ├── index.ts               # Signal store aggregator
│   ├── session.ts             # Session metadata, status
│   ├── actors.ts              # NPC/Player state (from projections)
│   ├── events.ts              # Event stream buffer
│   ├── world.ts               # NEW: Location, inventory, time
│   ├── ui.ts                  # Ephemeral UI state
│   └── computed.ts            # NEW: Derived state
│
├── hooks/                     # ENHANCED: Event streaming
│   ├── useWorldBus.ts         # NEW: SSE connection
│   ├── useSignal.ts           # NEW: Signal bindings
│   ├── useActor.ts            # NEW: Actor subscription
│   ├── useProjection.ts       # NEW: State projection access
│   ├── useIntent.ts           # NEW: Intent emission
│   └── ...existing hooks
│
├── features/
│   ├── builders/              # REORGANIZED
│   │   ├── character/         # Character creation (KEEP, enhance)
│   │   ├── setting/           # Setting creation
│   │   ├── session/           # Session setup
│   │   ├── location/          # Location/prefab editing
│   │   ├── persona/           # Persona profiles
│   │   ├── item/              # Item creation
│   │   └── tag/               # Prompt tags
│   │
│   ├── game/                  # NEW: Real-time game UI
│   │   ├── GameShell.tsx      # Main game container
│   │   ├── WorldView/         # Location display
│   │   ├── ActorPanel/        # NPC/Player cards
│   │   ├── ActionBar/         # Player intent input
│   │   ├── EventLog/          # Scrolling event feed
│   │   ├── InventoryPanel/    # Player inventory
│   │   ├── TimeDisplay/       # World clock
│   │   ├── DialoguePanel/     # NPC conversations
│   │   └── DevOverlay/        # Debug tools
│   │
│   ├── library/               # Asset browsing (KEEP)
│   └── admin/                 # Admin tools
│
├── components/                # NEW: Promoted shared components
│   ├── game/                  # Game-specific components
│   ├── forms/                 # Form primitives
│   └── layout/                # Layout components
│
├── services/
│   ├── stream.ts              # NEW: EventSource wrapper
│   ├── intent.ts              # NEW: Intent emission
│   └── api.ts                 # REST for builders
│
├── layouts/
└── styles/
```

---

## 3. Character System as Reference

The character builder demonstrates the **level of detail** we want in all entity systems. Key patterns to replicate:

### 3.1 Personality Architecture

From `@minimal-rpg/schemas/character/personality.ts`:

| System | Description | Game Impact |
|--------|-------------|-------------|
| **Big Five Dimensions** | 5 core traits (0-1 scale) | Base NPC behavior |
| **Facets** | 6 facets per dimension | Nuanced reactions |
| **Trait Aliases** | Natural language → dimension | LLM prompt parsing |
| **Emotional State** | Current emotion + intensity | Dialogue tone |
| **Core Values** | Prioritized motivations | Decision making |
| **Fears** | Triggers + coping mechanisms | Conflict drivers |
| **Attachment Style** | Relationship patterns | Trust/intimacy mechanics |
| **Social Patterns** | Stranger defaults, warmth rate | First impressions |
| **Speech Style** | Vocabulary, formality, humor | Dialogue generation |
| **Stress Behavior** | Fight/flight/freeze/fawn | Crisis reactions |

### 3.2 Body & Appearance System

| System | Description | Game Impact |
|--------|-------------|-------------|
| **Body Regions** | 14 regions (hair, torso, hands, etc.) | Sensory descriptions |
| **Sensory Data** | Scent, texture, flavor per region | Intimate encounters |
| **Appearance Regions** | Visual attributes per region | NPC descriptions |
| **Gender Filtering** | Region availability by gender | Anatomical accuracy |

### 3.3 Form Patterns

```typescript
// Mode-based complexity
type CharacterBuilderMode = 'quick' | 'standard' | 'advanced';

// Section visibility per mode
interface ModeConfig {
  sections: { basics, appearance, personality, body, details };
  basicFields: { name, age, gender, race, ... };
}

// Smart entry helpers
function findNextAvailableAppearanceEntry(used, available): AppearanceEntry;
function findNextAvailableSensoryEntry(used, available): BodySensoryEntry;
```

**Apply these patterns to:**
- Location builder (room types, atmospheres, connections)
- Item builder (properties, effects, appearance)
- Session builder (game modes, starting conditions)
- NPC runtime state (current emotions, goals, memory)

---

## 4. World Bus Integration

### 4.1 SSE Connection Hook

```typescript
// hooks/useWorldBus.ts
import { useEffect, useCallback } from 'react';
import { eventLog, pushEvent } from '../signals/events';
import { updateActor } from '../signals/actors';
import { updateWorld } from '../signals/world';
import type { WorldEvent } from '@minimal-rpg/schemas';

export function useWorldBus(sessionId: string) {
  useEffect(() => {
    const url = `${API_BASE}/stream/${sessionId}`;
    const source = new EventSource(url, { withCredentials: true });

    source.onmessage = (msg) => {
      const event: WorldEvent = JSON.parse(msg.data);

      // 1. Append to event log
      pushEvent(event);

      // 2. Route to appropriate signal updater
      switch (event.type) {
        case 'MOVED':
        case 'SPOKE':
        case 'ACTOR_SPAWN':
        case 'ACTOR_DESPAWN':
          updateActor(event);
          break;
        case 'TICK':
          updateWorld(event);
          break;
        // ... other event types
      }
    };

    source.onerror = (err) => {
      console.error('SSE error:', err);
      // Reconnect with backoff
    };

    return () => source.close();
  }, [sessionId]);
}
```

### 4.2 Intent Emission Hook

```typescript
// hooks/useIntent.ts
import { useCallback } from 'react';
import { emitIntent } from '../services/intent';
import type { Intent } from '@minimal-rpg/schemas';

export function useIntent(sessionId: string) {
  const emit = useCallback(async (intent: Omit<Intent, 'sessionId'>) => {
    await emitIntent({ ...intent, sessionId });
  }, [sessionId]);

  return {
    move: (destinationId: string) => emit({ type: 'MOVE_INTENT', destinationId }),
    speak: (content: string, targetActorId?: string) =>
      emit({ type: 'SPEAK_INTENT', content, targetActorId }),
    useItem: (itemId: string) => emit({ type: 'USE_ITEM_INTENT', itemId }),
    attack: (targetActorId: string) => emit({ type: 'ATTACK_INTENT', targetActorId }),
    wait: (duration?: number) => emit({ type: 'WAIT_INTENT', duration }),
  };
}
```

### 4.3 Actor Subscription Hook

```typescript
// hooks/useActor.ts
import { useComputed } from '@preact/signals-react';
import { actorStates } from '../signals/actors';
import type { ActorState } from '@minimal-rpg/schemas';

export function useActor(actorId: string): ActorState | undefined {
  return useComputed(() => actorStates.value[actorId]);
}

export function useActorsInLocation(locationId: string): ActorState[] {
  return useComputed(() =>
    Object.values(actorStates.value)
      .filter(a => a.locationId === locationId)
  );
}
```

---

## 5. Game UI Components

### 5.1 GameShell (Main Container)

```typescript
// features/game/GameShell.tsx
export function GameShell({ sessionId }: { sessionId: string }) {
  useWorldBus(sessionId);
  const session = useSession(sessionId);

  return (
    <div className="game-shell">
      <header>
        <TimeDisplay />
        <SessionStatus status={session.status} />
      </header>

      <main className="game-layout">
        <aside className="left-panel">
          <ActorPanel />
          <InventoryPanel />
        </aside>

        <section className="center-panel">
          <WorldView locationId={session.currentLocationId} />
          <ActionBar />
        </section>

        <aside className="right-panel">
          <EventLog />
          <DialoguePanel />
        </aside>
      </main>

      {import.meta.env.DEV && <DevOverlay />}
    </div>
  );
}
```

### 5.2 WorldView (Location Display)

```typescript
// features/game/WorldView/WorldView.tsx
export function WorldView({ locationId }: { locationId: string }) {
  const location = useLocation(locationId);
  const actors = useActorsInLocation(locationId);
  const exits = useExits(locationId);

  return (
    <div className="world-view">
      <LocationHeader name={location.name} type={location.type} />
      <LocationDescription description={location.description} />

      <section className="actors-present">
        {actors.map(actor => (
          <ActorCard key={actor.id} actor={actor} />
        ))}
      </section>

      <nav className="exits">
        {exits.map(exit => (
          <ExitButton key={exit.id} exit={exit} />
        ))}
      </nav>
    </div>
  );
}
```

### 5.3 EventLog (Scrolling Feed)

```typescript
// features/game/EventLog/EventLog.tsx
import { eventLog } from '../../../signals/events';

export function EventLog() {
  const events = eventLog.value;

  return (
    <div className="event-log">
      {events.map((event, idx) => (
        <EventEntry key={idx} event={event} />
      ))}
    </div>
  );
}

function EventEntry({ event }: { event: WorldEvent }) {
  switch (event.type) {
    case 'SPOKE':
      return <SpeechBubble actor={event.actorId} content={event.content} />;
    case 'MOVED':
      return <MovementNotice actor={event.actorId} to={event.toLocationId} />;
    case 'TICK':
      return <TimeMarker tick={event.tick} />;
    default:
      return <GenericEvent event={event} />;
  }
}
```

### 5.4 ActionBar (Player Input)

```typescript
// features/game/ActionBar/ActionBar.tsx
export function ActionBar() {
  const { move, speak, useItem, attack, wait } = useIntent(sessionId);
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    // Parse natural language input
    const intent = parsePlayerInput(input);

    switch (intent.type) {
      case 'move':
        await move(intent.destination);
        break;
      case 'say':
        await speak(intent.content, intent.target);
        break;
      case 'use':
        await useItem(intent.itemId);
        break;
      // ...
    }

    setInput('');
  };

  return (
    <div className="action-bar">
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="What do you do?"
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />
      <QuickActions onMove={move} onWait={wait} />
    </div>
  );
}
```

### 5.5 DevOverlay (Debug Tools)

```typescript
// features/game/DevOverlay/DevOverlay.tsx
export function DevOverlay() {
  const [visible, setVisible] = useState(false);
  const events = eventLog.value;
  const actors = actorStates.value;

  if (!visible) {
    return <button onClick={() => setVisible(true)}>🔧 Dev</button>;
  }

  return (
    <div className="dev-overlay">
      <button onClick={() => setVisible(false)}>Close</button>

      <section>
        <h3>Event Stream ({events.length})</h3>
        <pre>{JSON.stringify(events.slice(-10), null, 2)}</pre>
      </section>

      <section>
        <h3>Actor States</h3>
        <pre>{JSON.stringify(actors, null, 2)}</pre>
      </section>

      <section>
        <h3>Signal Inspector</h3>
        <SignalInspector />
      </section>
    </div>
  );
}
```

---

## 6. Signal Store Design

### 6.1 Session Signals

```typescript
// signals/session.ts
import { signal, computed } from '@preact/signals-react';
import type { Session } from '@minimal-rpg/schemas';

export const sessionData = signal<Session | null>(null);
export const sessionStatus = signal<'loading' | 'active' | 'paused' | 'ended'>('loading');
export const connectionStatus = signal<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

export const isPlaying = computed(() =>
  sessionStatus.value === 'active' && connectionStatus.value === 'connected'
);
```

### 6.2 Actor Signals

```typescript
// signals/actors.ts
import { signal, computed } from '@preact/signals-react';
import type { ActorState, WorldEvent } from '@minimal-rpg/schemas';

export const actorStates = signal<Record<string, ActorState>>({});

export const activeNpcs = computed(() =>
  Object.values(actorStates.value).filter(a => a.type === 'npc' && a.status === 'active')
);

export const playerActor = computed(() =>
  Object.values(actorStates.value).find(a => a.type === 'player')
);

export function updateActor(event: WorldEvent) {
  switch (event.type) {
    case 'ACTOR_SPAWN':
      actorStates.value = {
        ...actorStates.value,
        [event.actorId]: {
          id: event.actorId,
          type: event.actorType,
          locationId: event.locationId,
          status: 'active',
        },
      };
      break;
    case 'MOVED':
      const actor = actorStates.value[event.actorId];
      if (actor) {
        actorStates.value = {
          ...actorStates.value,
          [event.actorId]: { ...actor, locationId: event.toLocationId },
        };
      }
      break;
    case 'ACTOR_DESPAWN':
      const { [event.actorId]: removed, ...rest } = actorStates.value;
      actorStates.value = rest;
      break;
  }
}
```

### 6.3 World Signals

```typescript
// signals/world.ts
import { signal, computed } from '@preact/signals-react';

export interface WorldState {
  currentLocationId: string;
  tick: number;
  worldTime: Date;
  inventory: Record<string, number>;
}

export const worldState = signal<WorldState>({
  currentLocationId: '',
  tick: 0,
  worldTime: new Date(),
  inventory: {},
});

export const currentLocation = computed(() => worldState.value.currentLocationId);
export const currentTick = computed(() => worldState.value.tick);

export function updateWorld(event: WorldEvent) {
  if (event.type === 'TICK') {
    worldState.value = {
      ...worldState.value,
      tick: event.tick,
      worldTime: event.timestamp,
    };
  }
}
```

### 6.4 Event Buffer

```typescript
// signals/events.ts
import { signal } from '@preact/signals-react';
import type { WorldEvent } from '@minimal-rpg/schemas';

const MAX_EVENTS = 500;

export const eventLog = signal<WorldEvent[]>([]);

export function pushEvent(event: WorldEvent) {
  const current = eventLog.value;
  const updated = [...current, event];

  // Trim to max size
  if (updated.length > MAX_EVENTS) {
    eventLog.value = updated.slice(-MAX_EVENTS);
  } else {
    eventLog.value = updated;
  }
}

export function clearEvents() {
  eventLog.value = [];
}
```

---

## 7. Migration Phases

### Phase 1: Signal Infrastructure (Week 1)

| Task | Status | Files |
|------|--------|-------|
| Enhance `signals/` with world state | TODO | `signals/world.ts`, `signals/computed.ts` |
| Implement `useWorldBus` hook | TODO | `hooks/useWorldBus.ts` |
| Implement `useIntent` hook | TODO | `hooks/useIntent.ts` |
| Create `services/stream.ts` | TODO | SSE wrapper with reconnect |
| Create `services/intent.ts` | TODO | Intent emission API |

### Phase 2: Game Shell & Core Components (Weeks 2-3)

| Task | Status | Files |
|------|--------|-------|
| Create `GameShell` container | TODO | `features/game/GameShell.tsx` |
| Create `WorldView` component | TODO | `features/game/WorldView/` |
| Create `EventLog` component | TODO | `features/game/EventLog/` |
| Create `ActorPanel` component | TODO | `features/game/ActorPanel/` |
| Create `ActionBar` component | TODO | `features/game/ActionBar/` |
| Create `TimeDisplay` component | TODO | `features/game/TimeDisplay/` |

### Phase 3: Actor Hooks & Actor Cards (Week 4)

| Task | Status | Files |
|------|--------|-------|
| Implement `useActor` hook | TODO | `hooks/useActor.ts` |
| Implement `useActorsInLocation` hook | TODO | `hooks/useActor.ts` |
| Create `ActorCard` component | TODO | `features/game/ActorPanel/ActorCard.tsx` |
| Create `DialoguePanel` component | TODO | `features/game/DialoguePanel/` |
| Create NPC detail modal | TODO | Uses character personality display |

### Phase 4: Player Actions & Inventory (Week 5)

| Task | Status | Files |
|------|--------|-------|
| Implement natural language parser | TODO | `features/game/ActionBar/parser.ts` |
| Create `InventoryPanel` component | TODO | `features/game/InventoryPanel/` |
| Create `QuickActions` component | TODO | Movement, wait, common actions |
| Wire intents to API | TODO | `services/intent.ts` |

### Phase 5: Dev Tools & Polish (Week 6)

| Task | Status | Files |
|------|--------|-------|
| Create `DevOverlay` component | TODO | `features/game/DevOverlay/` |
| Add signal inspector | TODO | Real-time state debugging |
| Add event replay controls | TODO | Time-travel debugging |
| Performance optimization | TODO | Signal batching, memo |

### Phase 6: Legacy Removal (Week 7)

| Task | Status | Files |
|------|--------|-------|
| Remove `session-workspace/` | TODO | Delete legacy game UI |
| Remove `chat/` (polling-based) | TODO | Replaced by EventLog |
| Remove `chat-panel/` | TODO | Integrated into game |
| Update routes | TODO | Point to new GameShell |
| Clean up unused hooks | TODO | Remove Zustand remnants |

---

## 8. Builder Enhancements

While maintaining the existing builders, enhance them with World Bus concepts:

### 8.1 Session Builder Enhancements

Add configuration for:
- **Event streaming settings**: Buffer size, reconnect policy
- **Actor spawning rules**: Which NPCs start active
- **Time settings**: Tick rate, starting time
- **World initialization**: Starting location, inventory

### 8.2 Location Builder Enhancements

Add support for:
- **Atmosphere effects**: Lighting, sounds, smells
- **Capacity limits**: Max actors per location
- **Event triggers**: Location-specific events
- **Dynamic connections**: Conditional exits

### 8.3 NPC Configuration (Character Builder Extension)

Add runtime configuration:
- **Perception filters**: What events the NPC notices
- **Cognition tier**: Fast/deep/reasoning model
- **Schedule integration**: When active, where located
- **Memory settings**: Retention, importance thresholds

---

## 9. API Integration Points

### 9.1 New Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/stream/:sessionId` | GET (SSE) | World Bus event stream |
| `/intents` | POST | Emit player intent |
| `/sessions/:id/state` | GET | Current projection state |
| `/sessions/:id/actors` | GET | Active actor list |
| `/sessions/:id/replay` | POST | Replay from sequence |

### 9.2 Existing Endpoints (Keep)

| Endpoint | Purpose |
|----------|---------|
| `/characters/*` | Character CRUD |
| `/settings/*` | Setting CRUD |
| `/sessions/*` | Session CRUD (not state) |
| `/locations/*` | Location CRUD |
| `/profiles/*` | Entity profiles |

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Signal update functions
- Event routing logic
- Intent parsing
- Actor state reducers

### 10.2 Integration Tests

- SSE connection lifecycle
- Intent → Event flow
- Signal reactivity
- Component rendering with signals

### 10.3 E2E Tests

- Full game session flow
- Player action → NPC reaction
- Multiple client synchronization
- Reconnection scenarios

---

## 11. Performance Considerations

### 11.1 Signal Optimization

```typescript
// Batch updates to prevent render storms
import { batch } from '@preact/signals-react';

source.onmessage = (msg) => {
  const events: WorldEvent[] = JSON.parse(msg.data);

  batch(() => {
    for (const event of events) {
      pushEvent(event);
      updateActor(event);
      updateWorld(event);
    }
  });
};
```

### 11.2 Event Buffer Management

- Cap event log at 500 entries
- Implement virtualized scrolling for EventLog
- Use `computed` for filtered views instead of `.filter()` in render

### 11.3 SSE Reconnection

```typescript
// services/stream.ts
export function createEventStream(url: string, handlers: StreamHandlers) {
  let retries = 0;
  const maxRetries = 5;
  const baseDelay = 1000;

  function connect() {
    const source = new EventSource(url);

    source.onopen = () => {
      retries = 0;
      handlers.onConnect?.();
    };

    source.onerror = () => {
      source.close();
      handlers.onDisconnect?.();

      if (retries < maxRetries) {
        const delay = baseDelay * Math.pow(2, retries);
        setTimeout(connect, delay);
        retries++;
      } else {
        handlers.onError?.('Max reconnection attempts reached');
      }
    };

    source.onmessage = handlers.onMessage;

    return source;
  }

  return connect();
}
```

---

## 12. Summary

The web package refactor transforms the application from a traditional form-based SPA into a reactive game client:

| Aspect | Current | Target |
|--------|---------|--------|
| **State** | Zustand stores, REST polling | @preact/signals + SSE |
| **Updates** | Manual refresh | Real-time event stream |
| **Actions** | Form submissions | Intent emission |
| **Game UI** | session-workspace (legacy) | GameShell + signal-driven components |
| **Builders** | Keep, enhance | Add World Bus configuration |
| **Debug** | Console logging | DevOverlay with signal inspector |

The character builder serves as the reference for entity detail. Apply its patterns (personality system, sensory data, mode-based complexity) to all entity types and the runtime game state.
