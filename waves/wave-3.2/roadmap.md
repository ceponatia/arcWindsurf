# Wave 3.2: API Lint Foundation - Create Shared Utilities

This wave creates the foundational utility files that all subsequent lint remediation waves depend on. **This wave MUST be completed before waves 3.3-3.7.**

---

## Prerequisites

- None (this is the foundation wave)

## Deliverables

1. `packages/api/src/utils/uuid.ts` - UUID coercion helpers
2. `packages/api/src/types/actor-state.ts` - Typed actor state interfaces
3. `packages/api/src/types/db-rows.ts` - Typed database row interfaces
4. `packages/api/src/types/index.ts` - Re-exports
5. Updated `packages/api/src/utils/index.ts` - Include UUID exports

---

## Task 1: Create UUID Coercion Utilities

**File to create**: `packages/api/src/utils/uuid.ts`

**Why**: The `@minimal-rpg/db` package uses branded UUID types, but API code passes plain strings. This forces `as any` casts everywhere. These helpers provide a single, semantic cast location.

**Create this exact file**:

```typescript
/**
 * UUID Coercion Utilities
 *
 * The @minimal-rpg/db package uses branded UUID types for type safety.
 * These helpers provide semantic coercion from plain strings to branded types.
 *
 * Usage:
 *   Instead of: getActorState(sessionId as any, actorId)
 *   Use:        getActorState(toSessionId(sessionId), actorId)
 */

// Re-export branded types for convenience
// Note: These are structural brands, the actual runtime value is still a string

/**
 * Coerce a plain string to a SessionId branded type.
 * Use when passing session IDs to @minimal-rpg/db functions.
 */
export function toSessionId<T extends string>(id: T): T {
  return id;
}

/**
 * Coerce a plain string to an EntityProfileId branded type.
 * Use when passing entity profile IDs to @minimal-rpg/db functions.
 */
export function toEntityProfileId<T extends string>(id: T): T {
  return id;
}

/**
 * Coerce a plain string to a generic ID branded type.
 * Use when passing generic IDs to @minimal-rpg/db functions.
 */
export function toId<T extends string>(id: T): T {
  return id;
}

/**
 * Coerce an array of plain strings to branded ID types.
 * Use with inArray() and similar functions.
 */
export function toIds<T extends string>(ids: T[]): T[] {
  return ids;
}
```

---

## Task 2: Create Actor State Type Definitions

**File to create**: `packages/api/src/types/actor-state.ts`

**Why**: The `actor_states.state` column is typed as `unknown` in Drizzle. This file provides discriminated union types for the different state shapes.

**Create this exact file**:

```typescript
/**
 * Actor State Type Definitions
 *
 * These types define the shape of the JSON stored in actor_states.state column.
 * The column is typed as `unknown` in Drizzle, so we need these types to safely access properties.
 */
import type {
  CharacterProfile,
  NpcSchedule,
  PlayerInterestScore,
  NpcLocationState,
  GameTime,
} from '@minimal-rpg/schemas';

/**
 * Affinity record stored per-actor relationship.
 */
export interface AffinityRecord {
  relationshipType: string;
  affinity: {
    trust: number;
    fondness: number;
    fear: number;
  };
  createdAt: string;
}

/**
 * NPC actor state shape.
 * Stored in actor_states.state when actorType === 'npc'.
 */
export interface NpcActorState {
  /** Role in the session */
  role: 'primary' | 'supporting' | 'background' | 'antagonist';
  /** NPC tier for detail level */
  tier: 'major' | 'minor' | 'transient' | 'background';
  /** Display name */
  name: string;
  /** Optional label for identifying this NPC instance */
  label?: string | null;
  /** Serialized character profile (legacy, for display) */
  profileJson?: string;
  /** Current location state */
  location?: {
    currentLocationId: string;
  };
  /** NPC schedule data */
  schedule?: {
    templateId?: string;
    scheduleData?: NpcSchedule;
    placeholderMappings?: Record<string, string>;
  };
  /** Player interest score for this NPC */
  interest?: PlayerInterestScore;
  /** Simulation state */
  simulation?: {
    currentState?: NpcLocationState;
    lastComputedAt?: GameTime;
    dayDecisions?: Record<string, unknown>;
  };
  /** Affinity toward other actors */
  affinity?: Record<string, AffinityRecord>;
  /** Actor status */
  status: 'active' | 'inactive';
}

/**
 * Player actor state shape.
 * Stored in actor_states.state when actorType === 'player'.
 */
export interface PlayerActorState {
  /** Player profile data */
  profile: CharacterProfile | Record<string, unknown>;
  /** Actor status */
  status: 'active' | 'inactive';
}

/**
 * Union type for all actor states.
 */
export type ActorState = NpcActorState | PlayerActorState;

/**
 * Type guard to check if an actor state is an NPC state.
 *
 * @example
 * const state = actorRow.state as ActorState;
 * if (isNpcState(state)) {
 *   console.log(state.tier); // TypeScript knows this is NpcActorState
 * }
 */
export function isNpcState(state: ActorState): state is NpcActorState {
  return 'tier' in state || 'role' in state;
}

/**
 * Type guard to check if an actor state is a player state.
 */
export function isPlayerState(state: ActorState): state is PlayerActorState {
  return 'profile' in state && !('tier' in state);
}

/**
 * Safely cast unknown state to ActorState.
 * Use this when retrieving state from database.
 *
 * @example
 * const state = asActorState(actorRow.state);
 * if (isNpcState(state)) { ... }
 */
export function asActorState(state: unknown): ActorState {
  return state as ActorState;
}

/**
 * Safely cast unknown state to NpcActorState.
 * Only use when you KNOW the actor is an NPC.
 *
 * @example
 * // Only when actorType === 'npc'
 * const npcState = asNpcState(actorRow.state);
 */
export function asNpcState(state: unknown): NpcActorState {
  return state as NpcActorState;
}

/**
 * Safely cast unknown state to PlayerActorState.
 * Only use when you KNOW the actor is a player.
 */
export function asPlayerState(state: unknown): PlayerActorState {
  return state as PlayerActorState;
}
```

---

## Task 3: Create Database Row Type Definitions

**File to create**: `packages/api/src/types/db-rows.ts`

**Why**: Database rows from Drizzle queries have `unknown` JSON columns. These types provide proper typing for common row shapes.

**Create this exact file**:

```typescript
/**
 * Database Row Type Definitions
 *
 * These types define the shape of rows returned from Drizzle queries.
 * Use these to properly type mapper functions and avoid `as any` casts.
 */
import type { LocationNode, LocationConnection } from '@minimal-rpg/schemas';

/**
 * Row shape from location_maps table.
 */
export interface LocationMapRow {
  id: string;
  ownerEmail: string;
  name: string;
  description: string | null;
  settingId: string;
  nodesJson: LocationNode[] | null;
  connectionsJson: LocationConnection[] | null;
  defaultStartLocationId: string | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Row shape from location_prefabs table.
 */
export interface LocationPrefabRow {
  id: string;
  ownerEmail: string;
  name: string;
  description: string | null;
  category: string | null;
  nodesJson: LocationNode[] | null;
  connectionsJson: LocationConnection[] | null;
  entryPoints: string[];
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Row shape from schedule_templates table.
 */
export interface ScheduleTemplateRow {
  id: string;
  name: string;
  description: string | null;
  scheduleJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Row shape from entity_profiles table.
 */
export interface EntityProfileRow {
  id: string;
  entityType: 'character' | 'setting' | 'persona' | 'item';
  ownerEmail: string;
  name: string;
  profileJson: unknown;
  tags: string[] | null;
  visibility: 'private' | 'public';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Row shape from actor_states table.
 */
export interface ActorStateRow {
  id: string;
  sessionId: string;
  actorType: 'npc' | 'player';
  actorId: string;
  entityProfileId: string | null;
  state: unknown;
  lastEventSeq: bigint;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Task 4: Create Types Index File

**File to create**: `packages/api/src/types/index.ts`

**Why**: Barrel export for all type definitions.

**Create this exact file**:

```typescript
/**
 * API Type Definitions
 *
 * Re-exports all type definitions for easy importing.
 */

// Actor state types
export type {
  NpcActorState,
  PlayerActorState,
  ActorState,
  AffinityRecord,
} from './actor-state.js';

export {
  isNpcState,
  isPlayerState,
  asActorState,
  asNpcState,
  asPlayerState,
} from './actor-state.js';

// Database row types
export type {
  LocationMapRow,
  LocationPrefabRow,
  ScheduleTemplateRow,
  EntityProfileRow,
  ActorStateRow,
} from './db-rows.js';
```

---

## Task 5: Update Utils Index to Export UUID Helpers

**File to modify**: `packages/api/src/utils/index.ts`

**Action**: Add export for UUID utilities.

**If the file exists**, add this line at the end:

```typescript
export * from './uuid.js';
```

**If the file does NOT exist**, create it with:

```typescript
/**
 * API Utilities
 */
export * from './uuid.js';
export * from './responses.js';
```

---

## Validation Steps

After completing all tasks, run these commands to verify:

```bash
# 1. Check TypeScript compilation
pnpm --filter @minimal-rpg/api typecheck

# 2. Verify the files exist
ls -la packages/api/src/utils/uuid.ts
ls -la packages/api/src/types/actor-state.ts
ls -la packages/api/src/types/db-rows.ts
ls -la packages/api/src/types/index.ts

# 3. Check imports work (should not error)
cd packages/api && npx tsc --noEmit src/types/index.ts
```

---

## Files Created

| File | Purpose |
|------|---------|
| `src/utils/uuid.ts` | UUID coercion helpers to eliminate `as any` casts |
| `src/types/actor-state.ts` | Typed interfaces for actor state JSON blobs |
| `src/types/db-rows.ts` | Typed interfaces for database row shapes |
| `src/types/index.ts` | Barrel exports |

---

## Next Wave

After completing this wave, proceed to **Wave 3.3: Fix simulation-hooks.ts**.
