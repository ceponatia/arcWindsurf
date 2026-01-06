# @minimal-rpg/actors

XState-based autonomous actors with perception, cognition, and action loops.

## Overview

This package implements the actor model for the World Bus architecture. Actors are autonomous entities that:

1. **Perceive** - Filter and process events from the WorldBus
2. **Think** - Decide on actions based on perception
3. **Act** - Emit intents back to the WorldBus

## Actor Types

### NPC Actors

- Full perception/cognition/action loop
- React to world events autonomously
- Emit intents based on simple rules (Phase 3) or LLM decisions (Phase 4+)

### Player Actors

- Lightweight observers (Phase 3)
- Will handle player input in multiplayer (future)

## Usage

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

// Actor automatically subscribes to WorldBus and processes events

// Despawn when done
actorRegistry.despawn('barkeep-1');
```

## State Machine

NPCs use XState to manage their lifecycle:

```text
idle → perceiving → thinking → acting → waiting → idle
```

- **idle**: Waiting for events
- **perceiving**: Processing incoming events
- **thinking**: Deciding on actions
- **acting**: Emitting intents
- **waiting**: Cooldown period

## Phase 3 Implementation

Current implementation uses simple rule-based cognition:
- Respond to speech from other actors
- Acknowledge when someone enters the location
- Ignore irrelevant events

Phase 4 will replace this with LLM-based decision making for rich, contextual responses.

## Testing

```bash
pnpm test
```

## See Also

- [AGENTS.md](./AGENTS.md) - Package architecture and principles
- [World Bus Refactor Plan](../../dev-docs/world-bus-refactor-plan.md) - Overall architecture
