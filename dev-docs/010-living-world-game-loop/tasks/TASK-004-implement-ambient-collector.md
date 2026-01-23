# TASK-004: Implement AmbientCollector Service

**Priority**: P0
**Estimate**: 4 hours
**Depends On**: TASK-001 (TurnOrchestrator)
**Category**: Living World Game Loop

---

## Objective

Create an `AmbientCollector` service that gathers background world events and converts them into narrative descriptions that can be woven into the player's chat experience.

## Problem Statement

When the player takes a turn:

1. Background NPCs may have changed state (moved, started activities)
2. World events may have occurred (weather, time of day changes)
3. NPCs in the same location may be doing observable things

The player should perceive these changes as ambient narration without being overwhelmed.

## Files to Create

- `packages/api/src/services/ambient-collector.ts`
- `packages/api/src/services/ambient-collector.test.ts`

## Interface Design

```typescript
import type { WorldEvent } from '@minimal-rpg/schemas';

/**
 * A single ambient event that can be narrated.
 */
export interface AmbientEvent {
  /** Type of ambient event */
  type: 'npc-action' | 'npc-entrance' | 'npc-exit' | 'world-event' | 'atmosphere';
  /** Pre-generated narrative text */
  narration: string;
  /** Priority (higher = more important) */
  priority: number;
  /** Source entity ID (if applicable) */
  sourceId?: string;
  /** When the event occurred */
  timestamp: Date;
}

/**
 * Options for collecting ambient events.
 */
export interface AmbientCollectorOptions {
  /** Session ID */
  sessionId: string;
  /** Player's current location */
  locationId: string;
  /** NPCs the player is actively talking to (exclude from ambient) */
  focusedNpcIds: string[];
  /** How many ambient narrations to return (max) */
  limit: number;
  /** Narrative verbosity level */
  verbosity: 'minimal' | 'standard' | 'verbose';
  /** Events that occurred since last turn */
  recentEvents: WorldEvent[];
}

/**
 * Collects and curates ambient events for narration.
 */
export class AmbientCollector {
  /**
   * Collect ambient events and convert to narration.
   */
  async collect(options: AmbientCollectorOptions): Promise<AmbientEvent[]>;
}
```

## Implementation Steps

### 1. Event Filtering

Filter WorldBus events to find relevant ambient occurrences:

```typescript
private filterRelevantEvents(
  events: WorldEvent[],
  locationId: string,
  focusedNpcIds: string[]
): WorldEvent[] {
  return events.filter((event) => {
    // Skip events from focused NPCs (they'll respond directly)
    if ('actorId' in event && focusedNpcIds.includes(event.actorId as string)) {
      return false;
    }

    // Include MOVED events where destination is player's location
    if (event.type === 'MOVED') {
      return event.toLocationId === locationId;
    }

    // Include SPOKE events at player's location (background chatter)
    if (event.type === 'SPOKE') {
      // Need to check if actorId is at player's location
      return true; // Will filter by location check later
    }

    return false;
  });
}
```

### 2. Priority Assignment

Assign priority based on NPC tier and event type:

```typescript
private async assignPriority(
  event: WorldEvent,
  sessionId: string
): Promise<number> {
  let basePriority = 50;

  // Boost priority for certain event types
  if (event.type === 'MOVED') {
    basePriority += 20; // Entrances/exits are notable
  }

  // Get NPC tier if applicable
  if ('actorId' in event) {
    const npc = await this.getNpcInfo(sessionId, event.actorId as string);
    if (npc) {
      switch (npc.tier) {
        case 'major':
          basePriority += 30;
          break;
        case 'minor':
          basePriority += 15;
          break;
        case 'background':
          basePriority += 0;
          break;
        case 'transient':
          basePriority -= 10;
          break;
      }
    }
  }

  return Math.min(100, Math.max(0, basePriority));
}
```

### 3. Narration Generation

Convert events to narrative text using the encounter service:

```typescript
import {
  generateNpcEntranceNarration,
  generateNpcExitNarration
} from '@minimal-rpg/services';

private async generateNarration(
  event: WorldEvent,
  sessionId: string
): Promise<string> {
  switch (event.type) {
    case 'MOVED': {
      const npc = await this.getNpcInfo(sessionId, event.actorId);
      if (!npc) return '';

      // Check if this is an entrance or exit relative to player
      if (event.toLocationId === this.currentLocationId) {
        return generateNpcEntranceNarration(
          { npcId: npc.id, name: npc.name, appearance: npc.appearance, activity: npc.activity, tier: npc.tier },
          this.getExitDirection(event.fromLocationId)
        );
      } else {
        return generateNpcExitNarration(
          { npcId: npc.id, name: npc.name, appearance: npc.appearance, activity: npc.activity, tier: npc.tier },
          this.getExitDirection(event.toLocationId)
        );
      }
    }

    case 'SPOKE': {
      // Background dialogue - summarize or quote
      const npc = await this.getNpcInfo(sessionId, event.actorId);
      if (!npc) return '';

      // Don't include full dialogue, just note that they're talking
      if (event.targetActorId) {
        const target = await this.getNpcInfo(sessionId, event.targetActorId);
        return `${npc.name} says something to ${target?.name ?? 'someone'}.`;
      }
      return `${npc.name} mutters something under their breath.`;
    }

    default:
      return '';
  }
}
```

### 4. Collect Method Implementation

```typescript
async collect(options: AmbientCollectorOptions): Promise<AmbientEvent[]> {
  const {
    sessionId,
    locationId,
    focusedNpcIds,
    limit,
    verbosity,
    recentEvents,
  } = options;

  this.currentLocationId = locationId;

  // Filter to relevant events
  const relevant = this.filterRelevantEvents(recentEvents, locationId, focusedNpcIds);

  // Convert to ambient events with priority
  const ambientEvents: AmbientEvent[] = [];

  for (const event of relevant) {
    const priority = await this.assignPriority(event, sessionId);
    const narration = await this.generateNarration(event, sessionId);

    if (narration) {
      ambientEvents.push({
        type: this.getAmbientType(event),
        narration,
        priority,
        sourceId: 'actorId' in event ? (event.actorId as string) : undefined,
        timestamp: event.timestamp ?? new Date(),
      });
    }
  }

  // Add current activity narrations for NPCs at location
  const npcsAtLocation = await this.getNpcsAtLocation(sessionId, locationId);
  const backgroundNpcs = npcsAtLocation.filter(
    (npc) => !focusedNpcIds.includes(npc.id) &&
             (npc.tier === 'background' || npc.tier === 'minor')
  );

  // Add activity descriptions based on verbosity
  if (verbosity !== 'minimal' && backgroundNpcs.length > 0) {
    const activityNarration = this.generateActivityNarration(backgroundNpcs, verbosity);
    if (activityNarration) {
      ambientEvents.push({
        type: 'npc-action',
        narration: activityNarration,
        priority: 40,
        timestamp: new Date(),
      });
    }
  }

  // Sort by priority and limit
  return ambientEvents
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
```

### 5. Activity Narration for Background NPCs

```typescript
private generateActivityNarration(
  npcs: NpcInfo[],
  verbosity: 'minimal' | 'standard' | 'verbose'
): string | null {
  if (npcs.length === 0) return null;

  if (verbosity === 'standard' && npcs.length === 1) {
    const npc = npcs[0]!;
    return `${npc.name} ${npc.activity?.description ?? 'is nearby'}.`;
  }

  if (verbosity === 'verbose') {
    return npcs
      .map((npc) => `${npc.name} ${npc.activity?.description ?? 'is here'}`)
      .join('. ') + '.';
  }

  // Standard with multiple NPCs - summarize
  if (npcs.length <= 3) {
    const names = npcs.map((n) => n.name).join(' and ');
    return `${names} go about their business nearby.`;
  }

  return `Several people go about their business nearby.`;
}
```

## Integration with TurnOrchestrator

In `TurnOrchestrator.processTurn()`:

```typescript
// Step 4: Collect ambient events
const ambientCollector = new AmbientCollector();
const ambientEvents = await ambientCollector.collect({
  sessionId: input.sessionId,
  locationId: input.locationId,
  focusedNpcIds: input.focusedNpcId ? [input.focusedNpcId] : [],
  limit: this.config.maxAmbientNarrations,
  verbosity: this.config.narrativeMode,
  recentEvents: collectedEvents, // Events from this turn
});

const ambientNarration = ambientEvents.map((e) => e.narration);
```

## Acceptance Criteria

- [ ] `AmbientCollector` class created with `collect()` method
- [ ] Events filtered by location and focused NPCs
- [ ] Priority assigned based on NPC tier and event type
- [ ] Narration generated for MOVED events (entrances/exits)
- [ ] Background NPC activities described based on verbosity
- [ ] Results sorted by priority and limited
- [ ] Integration point documented for TurnOrchestrator
- [ ] Unit tests cover filtering, prioritization, and narration

## Testing

```typescript
describe('AmbientCollector', () => {
  const collector = new AmbientCollector();

  it('should prioritize major NPC events over background', async () => {
    const events = await collector.collect({
      sessionId: 'test',
      locationId: 'tavern',
      focusedNpcIds: [],
      limit: 5,
      verbosity: 'standard',
      recentEvents: [
        { type: 'MOVED', actorId: 'major-npc', toLocationId: 'tavern', ... },
        { type: 'MOVED', actorId: 'background-npc', toLocationId: 'tavern', ... },
      ],
    });

    expect(events[0].sourceId).toBe('major-npc');
  });

  it('should exclude focused NPC from ambient events', async () => {
    const events = await collector.collect({
      sessionId: 'test',
      locationId: 'tavern',
      focusedNpcIds: ['talking-npc'],
      limit: 5,
      verbosity: 'standard',
      recentEvents: [
        { type: 'SPOKE', actorId: 'talking-npc', content: 'Hello', ... },
      ],
    });

    expect(events).toHaveLength(0);
  });

  it('should respect verbosity settings', async () => {
    const minimalEvents = await collector.collect({
      ...baseOptions,
      verbosity: 'minimal',
    });

    const verboseEvents = await collector.collect({
      ...baseOptions,
      verbosity: 'verbose',
    });

    expect(verboseEvents.length).toBeGreaterThanOrEqual(minimalEvents.length);
  });
});
```

## Notes

- Consider caching NPC info lookups
- May want to add world events (weather, time of day) in Phase 2
- Activity narrations could be LLM-enhanced for more variety
