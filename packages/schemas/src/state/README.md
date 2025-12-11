# State Schemas

Session-level state schemas for the RPG engine. These define transient state that lives within a session (as opposed to persistent domain state stored in the database).

## Overview

State slices are independent categories of session state with their own Zod schemas. The state manager validates and merges these at runtime.

## Available Slices

### Proximity (`proximity.ts`)

Tracks ongoing physical/sensory relationships between player and NPCs.

**Key Types:**

| Type                  | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `SenseType`           | `'look' \| 'touch' \| 'smell' \| 'taste' \| 'hear'`     |
| `EngagementIntensity` | `'casual' \| 'focused' \| 'intimate'`                   |
| `ProximityLevel`      | `'distant' \| 'near' \| 'close' \| 'intimate'`          |
| `SensoryEngagement`   | Individual engagement with NPC body part                |
| `ProximityState`      | Full proximity state with engagements and NPC proximity |

**Helper Functions:**

- `createDefaultProximityState()` - Empty proximity state
- `makeEngagementKey(npcId, bodyPart, senseType)` - Generate engagement key
- `parseEngagementKey(key)` - Parse key back to components

**Usage:**

```typescript
import {
  ProximityStateSchema,
  createDefaultProximityState,
  makeEngagementKey,
} from '@minimal-rpg/schemas';

const state = createDefaultProximityState();
const key = makeEngagementKey('taylor', 'hair', 'smell');
// key = 'taylor:hair:smell'

state.engagements[key] = {
  npcId: 'taylor',
  bodyPart: 'hair',
  senseType: 'smell',
  intensity: 'focused',
  startedAt: 1,
  lastActiveAt: 1,
};
```

## Adding New State Slices

See the [State Manager Slice Authoring Guide](../../../state-manager/README.md#slice-authoring-guide) for step-by-step instructions.

### Quick Checklist

1. [ ] Create schema file in this directory (e.g., `dialogue.ts`)
2. [ ] Define Zod schema with all fields
3. [ ] Export types from the schema
4. [ ] Add `createDefault*State()` factory function
5. [ ] Export from `index.ts`
6. [ ] Register slice in state manager at startup
7. [ ] Wire persistence (session cache or DB)
8. [ ] Add tool patch emission for state updates

## Persistence Categories

| Category     | Storage            | Lifetime                    | Examples            |
| ------------ | ------------------ | --------------------------- | ------------------- |
| Session-only | In-memory cache    | Current session             | proximity, dialogue |
| Persistent   | Postgres instances | Survives session boundaries | character, setting  |

Session-only state is stored in `SessionStateCache` (see `packages/api/src/sessions/state-cache.ts`).
