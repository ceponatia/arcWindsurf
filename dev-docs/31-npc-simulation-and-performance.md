# NPC Simulation and Performance

> **Status**: IMPLEMENTED (schema foundation)
> **Last Updated**: December 2025

This document covers the background simulation strategy for NPCs, including tiered simulation, performance budgets, and time skip handling.

**Implementation**: `packages/schemas/src/simulation/`

- `types.ts` - TypeScript types for simulation triggers, configs, priorities, results
- `schemas.ts` - Zod validation schemas
- `utils.ts` - Priority calculation, cache management, trigger filtering
- `defaults.ts` - Default configurations and factory functions
- `index.ts` - Barrel exports

Split from [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md).

## 1. Simulation Trigger Points

NPC schedules are evaluated at these points:

1. **Session start** - When a session begins, determine where each NPC is
2. **Time advancement** - When game time passes (including player wait/skip)
3. **Location change** - When the player moves to a new location
4. **Period change** - When the time period changes (dawn, morning, etc.)

## 2. Lazy vs Eager Simulation

For performance, most NPCs use **lazy simulation** while important NPCs use **eager simulation**.

### 2.1 Simulation State Cache

```typescript
export interface NpcSimulationState {
  /** Last time this NPC's state was computed */
  lastComputedAt: GameTime;

  /** Current computed state */
  currentState: NpcLocationState;

  /** Cached schedule decisions for the current day */
  dayDecisions: Map<string, ScheduleOption>; // slotId -> resolved choice
}

/**
 * Lazy simulation: only compute NPC state when needed.
 */
export function getNpcState(
  npcId: string,
  currentTime: GameTime,
  forceRecompute = false
): NpcLocationState {
  const cached = npcSimulationCache.get(npcId);

  // If we have a recent computation for the same time period, use it
  if (cached && !forceRecompute && isSameSlot(cached.lastComputedAt, currentTime)) {
    return cached.currentState;
  }

  // Otherwise, compute the current state
  return computeNpcState(npcId, currentTime);
}
```

## 3. Tiered Simulation Strategy

NPC tiers determine simulation frequency and whether updates block the turn.

> **PM Notes**: I agree with this for the most part. To add to it, since we will try to classify npcs as major vs. minor vs. fluff, maybe use eager updates on major npcs and less intense updates as we go down the importance scale. Many updates for npcs that aren't in the same area could be asynchronous so they don't hold up turns.

### 3.1 Tier Configuration

```typescript
export interface TieredSimulationConfig {
  /** Major NPCs: eager, synchronous updates */
  major: {
    strategy: 'eager';
    updateOn: ('turn' | 'period-change' | 'location-change')[];
    async: false;
  };

  /** Minor NPCs: lazy with frequent cache refresh */
  minor: {
    strategy: 'lazy';
    cacheMinutes: 15;
    updateOn: ('period-change' | 'location-change')[];
    async: true; // Non-blocking
  };

  /** Background NPCs: very lazy, coarse updates */
  background: {
    strategy: 'lazy';
    cacheMinutes: 60;
    updateOn: 'location-change'[];
    async: true;
  };

  /** Transient NPCs: on-demand only */
  transient: {
    strategy: 'on-demand';
    generateOnEncounter: true;
    async: true;
  };
}
```

### 3.2 Simulation Tick Processing

```typescript
/**
 * Process simulation updates with tier-aware batching.
 * Major NPCs block, others run async in background.
 */
export async function processSimulationTick(
  sessionId: string,
  currentTime: GameTime,
  trigger: 'turn' | 'period-change' | 'location-change'
): Promise<SimulationResult> {
  const allNpcs = await getSessionNpcs(sessionId);

  // Separate by tier
  const major = allNpcs.filter((n) => n.tier === 'major');
  const minor = allNpcs.filter((n) => n.tier === 'minor');
  const background = allNpcs.filter((n) => n.tier === 'background');

  // Major NPCs: synchronous, blocking
  const majorResults = await Promise.all(
    major.map((npc) => simulateNpc(npc, currentTime, trigger))
  );

  // Minor + Background: async, non-blocking
  // Fire and forget - results will be cached for next read
  if (trigger !== 'turn') {
    // Don't update minors on every turn
    setImmediate(() => {
      minor.forEach((npc) => simulateNpc(npc, currentTime, trigger));
    });
  }

  if (trigger === 'location-change') {
    setImmediate(() => {
      background.forEach((npc) => simulateNpc(npc, currentTime, trigger));
    });
  }

  // Only return major NPC results (they're what matters for immediate response)
  return { majorResults };
}
```

### 3.3 Update Frequency Summary

| Tier       | On Turn | On Period Change | On Location Change | On Time Skip               |
| ---------- | ------- | ---------------- | ------------------ | -------------------------- |
| Major      | ✅ Sync | ✅ Sync          | ✅ Sync            | ✅ Full simulation         |
| Minor      | ❌      | ✅ Async         | ✅ Async           | ✅ Coarse simulation       |
| Background | ❌      | ❌               | ✅ Async           | ❌ Regenerate on encounter |
| Transient  | ❌      | ❌               | ❌                 | ❌ Generate fresh          |

## 4. Time Skip Simulation

When the player skips significant time, we need to simulate what NPCs did.

### 4.1 Time Skip Data Structures

```typescript
export interface TimeSkipSimulation {
  /** NPCs whose state changed during the skip */
  stateChanges: NpcStateChange[];

  /** Notable events that occurred (for potential narration) */
  events: SimulatedEvent[];
}

export interface NpcStateChange {
  npcId: string;
  previousLocation: NpcLocationState;
  newLocation: NpcLocationState;
}

export interface SimulatedEvent {
  time: GameTime;
  type: string;
  description: string;
  involvedNpcs: string[];
}
```

### 4.2 Time Skip Simulation Logic

```typescript
/**
 * Simulate what happened during a time skip.
 * This is a lightweight simulation - no LLM calls, just schedule resolution.
 */
export function simulateTimeSkip(
  fromTime: GameTime,
  toTime: GameTime,
  relevantNpcs: string[]
): TimeSkipSimulation {
  const stateChanges: NpcStateChange[] = [];
  const events: SimulatedEvent[] = [];

  for (const npcId of relevantNpcs) {
    const npc = loadNpc(npcId);
    const schedule = loadSchedule(npc.scheduleId);

    // Walk through time slots between fromTime and toTime
    const slots = getSlotsBetween(schedule, fromTime, toTime);

    for (const slot of slots) {
      // Resolve any choices made during this period
      const resolved = resolveSlotDestination(slot.destination);

      // Check if location changed
      const previousState = getNpcState(npcId, slot.startTime);
      if (resolved.locationId !== previousState.locationId) {
        stateChanges.push({
          npcId,
          previousLocation: previousState,
          newLocation: {
            locationId: resolved.locationId,
            subLocationId: resolved.subLocationId,
            activity: resolved.activity,
            arrivedAt: {
              day: fromTime.day,
              hour: slot.startTime.hour,
              minute: slot.startTime.minute,
              second: 0,
            },
            interruptible: resolved.activity.engagement !== 'absorbed',
          },
        });
      }
    }
  }

  return { stateChanges, events };
}
```

### 4.3 Tier-Specific Time Skip Handling

| Tier       | Time Skip Behavior                                          |
| ---------- | ----------------------------------------------------------- |
| Major      | Full slot-by-slot simulation, track all location changes    |
| Minor      | Coarse simulation (start/end state only)                    |
| Background | No simulation, regenerate when player visits their location |
| Transient  | Discarded, generate fresh if re-encountered                 |

## 5. Performance Budget

### 5.1 Simulation Budget Configuration

```typescript
export interface SimulationConfig {
  /** Maximum NPCs to simulate per time advancement */
  maxNpcsPerTick: number;

  /** Only simulate NPCs within N locations of player */
  simulationRadius: number;

  /** Cache duration for NPC state (in game minutes) */
  cacheDurationMinutes: number;

  /** Batch size for time skip simulation */
  timeSkipBatchSize: number;
}

const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  maxNpcsPerTick: 20,
  simulationRadius: 3, // 3 locations away
  cacheDurationMinutes: 30,
  timeSkipBatchSize: 10,
};
```

### 5.2 Fidelity by Distance

NPCs are simulated at different fidelities based on distance from player:

| Distance          | Simulation Fidelity        |
| ----------------- | -------------------------- |
| Same location     | Full schedule + choices    |
| Adjacent location | Full schedule, cached      |
| Same area         | Coarse (period-level only) |
| Distant           | No active simulation       |

### 5.3 Budget Enforcement

```typescript
/**
 * Enforce simulation budget by prioritizing NPCs.
 */
export function prioritizeNpcsForSimulation(
  npcs: NpcInfo[],
  playerLocation: string,
  config: SimulationConfig
): NpcInfo[] {
  // Score each NPC by priority
  const scored = npcs.map((npc) => ({
    npc,
    score: calculateSimulationPriority(npc, playerLocation),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top N based on budget
  return scored.slice(0, config.maxNpcsPerTick).map((s) => s.npc);
}

function calculateSimulationPriority(npc: NpcInfo, playerLocation: string): number {
  let score = npc.tierPriority; // Base from tier (10 for major, 5 for minor, etc.)

  // Boost for proximity
  const distance = calculateLocationDistance(npc.locationId, playerLocation);
  score += Math.max(0, 10 - distance * 2);

  // Boost for recent interaction
  if (npc.turnsSinceInteraction < 10) {
    score += 5;
  }

  return score;
}
```

## 6. Simulation Priority Decay

Major NPCs that haven't been interacted with recently can have their simulation priority reduced without changing their tier.

```typescript
export interface SimulationPriority {
  npcId: string;
  basePriority: number; // From tier
  currentPriority: number; // Adjusted by recency
  lastInteractionTurn: number;
}

/**
 * Adjust simulation priority based on how recently the player interacted.
 */
export function adjustSimulationPriority(npc: SimulationPriority, currentTurn: number): number {
  const turnsSince = currentTurn - npc.lastInteractionTurn;

  // Priority decays over time but never below tier minimum
  const decayFactor = Math.max(0.1, 1 - turnsSince / 1000);
  const tierMinimum = getTierMinimumPriority(npc.basePriority);

  return Math.max(tierMinimum, npc.basePriority * decayFactor);
}

function getTierMinimumPriority(basePriority: number): number {
  // Major NPCs never go below 3, minor never below 1
  if (basePriority >= 10) return 3; // Major
  if (basePriority >= 5) return 1; // Minor
  return 0; // Background/Transient
}
```

### 6.1 Strategy by Priority Range

| Priority Range | Strategy  | Update Frequency           |
| -------------- | --------- | -------------------------- |
| 8-10           | Eager     | Every turn                 |
| 5-7            | Active    | Every period change        |
| 2-4            | Lazy      | On location change         |
| 0-1            | On-Demand | Only when directly queried |

## 7. Async Processing Architecture

### 7.1 Non-Blocking Updates

```typescript
/**
 * Queue for async NPC updates.
 */
class NpcSimulationQueue {
  private queue: SimulationTask[] = [];
  private processing = false;

  enqueue(task: SimulationTask): void {
    this.queue.push(task);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await this.processTask(task);

      // Yield to event loop between tasks
      await new Promise((resolve) => setImmediate(resolve));
    }

    this.processing = false;
  }

  private async processTask(task: SimulationTask): Promise<void> {
    const result = await simulateNpc(task.npcId, task.time, task.trigger);
    npcSimulationCache.set(task.npcId, result);
  }
}

const simulationQueue = new NpcSimulationQueue();
```

### 7.2 Cache Invalidation

```typescript
/**
 * Invalidate cache for NPCs affected by events.
 */
export function invalidateNpcCache(event: GameEvent): void {
  switch (event.type) {
    case 'period-change':
      // Invalidate all NPCs with time-sensitive schedules
      npcSimulationCache.invalidateByCondition((state) =>
        state.currentSlot?.conditions?.some((c) => c.type === 'time-of-day')
      );
      break;

    case 'weather-change':
      // Invalidate NPCs with weather-dependent schedules
      npcSimulationCache.invalidateByCondition((state) =>
        state.currentSlot?.conditions?.some((c) => c.type === 'weather')
      );
      break;

    case 'flag-change':
      // Invalidate NPCs affected by this flag
      const flagId = event.payload.flagId;
      npcSimulationCache.invalidateByCondition((state) =>
        state.currentSlot?.conditions?.some((c) => c.type === 'flag' && c.params.flag === flagId)
      );
      break;
  }
}
```

## 8. Open Questions

1. **Parallel Processing**: Should we use worker threads for heavy time skip simulations?

2. **Cache Persistence**: Should simulation cache persist to database, or stay in-memory only?

3. **Prediction**: Could we pre-compute likely next states for major NPCs to reduce latency?

4. **Event Coalescing**: If multiple triggers fire in quick succession, should we coalesce them?

## 9. Related Documents

- [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md) - Schedule system
- [26-time-system.md](26-time-system.md) - Time system
- [30-npc-tiers-and-promotion.md](30-npc-tiers-and-promotion.md) - NPC tier definitions
- [32-npc-encounters-and-occupancy.md](32-npc-encounters-and-occupancy.md) - Encounter generation
