# NPC Schedules and Routines

> **Status**: BRAINSTORM
> **Last Updated**: December 2025

This document is the canonical reference for the **schedule data model** (slots, choices, conditions, overrides, templates).

Related docs:

- [26-time-system.md](26-time-system.md) - time advancement and time skipping
- [28-affinity-and-relationship-dynamics.md](28-affinity-and-relationship-dynamics.md) - affinity dimensions and how scores evolve
- [30-npc-tiers-and-promotion.md](30-npc-tiers-and-promotion.md) - which NPCs need schedules and how promotion works
- [31-npc-simulation-and-performance.md](31-npc-simulation-and-performance.md) - how schedules are evaluated and cached
- [32-npc-encounters-and-occupancy.md](32-npc-encounters-and-occupancy.md) - how "who is here" is computed and narrated

---

## 1. Design Philosophy

Goals:

- **Create a living world**: NPCs have plausible routines.
- **Enable emergent gameplay**: being early/late matters.
- **Support probabilistic behavior**: NPCs choose among options.
- **Stay data-first**: schedules are structured, not scripts.

Core concept: each NPC has a schedule that maps time ranges to a destination + activity.

---

## 2. Location + Proximity (Minimal)

NPC schedules select destinations using the location system in [05-locations-schema.md](05-locations-schema.md).

We separate "where in the world" from "how close in the scene":

```typescript
/**
 * World-level proximity: Where is the NPC relative to the player's location?
 * Used for scheduling, encounter generation, and travel.
 */
export type WorldProximity = 'same-location' | 'adjacent' | 'same-area' | 'distant' | 'unreachable';

/**
 * Interaction proximity: How close during active interaction?
 * Used for sensory triggers, combat, and intimacy checks.
 * Only meaningful when WorldProximity is 'same-location'.
 */
export type InteractionProximity = 'intimate' | 'close' | 'near' | 'far' | 'observing';

export interface NpcProximityState {
  /** Where in the world relative to player */
  world: WorldProximity;

  /** How close during interaction (only set when world === 'same-location') */
  interaction?: InteractionProximity;

  /** Whether the NPC is aware of the player */
  aware: boolean;

  /** Whether the player knows this NPC is present */
  playerAware: boolean;
}
```

---

## 3. Schedule Schema

### 3.1 Core Types

```typescript
export interface NpcSchedule {
  /** Unique schedule identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Days this schedule applies (0=Sunday, 6=Saturday). If omitted, applies daily. */
  applicableDays?: number[];

  /** Time slots defining where/what */
  slots: ScheduleSlot[];

  /** Fallback when no slot matches */
  defaultSlot: ScheduleSlot;

  /** Conditions that override normal scheduling */
  overrideConditions?: ScheduleOverride[];
}

export interface ScheduleSlot {
  /** When this slot starts */
  startTime: { hour: number; minute: number };

  /** When this slot ends */
  endTime: { hour: number; minute: number };

  /** Where the NPC goes */
  destination: ScheduleDestination | ScheduleChoice;

  /** What the NPC does there */
  activity: NpcActivity;

  /** Higher priority wins on overlap */
  priority: number;
}

export interface ScheduleDestination {
  type: 'fixed';
  locationId: string;
  subLocationId?: string;
}

export interface ScheduleChoice {
  type: 'choice';
  options: ScheduleOption[];
}

export interface ScheduleOption {
  locationId: string;
  subLocationId?: string;
  activity: NpcActivity;
  weight: number;
  conditions?: ChoiceCondition[];
}

export interface NpcActivity {
  /** Activity type identifier */
  type: string;

  /** Human-readable description */
  description: string;

  /** How engaged they are (affects interruptibility) */
  engagement: 'idle' | 'casual' | 'focused' | 'absorbed';

  /** Optional: what they're interacting with */
  target?: string;
}
```

### 3.2 Choice Resolution (2d6)

When a slot's destination is a choice, resolve via 2d6 (bell curve) so "common" options happen often while still allowing rare variation.

```typescript
export function resolveScheduleChoice(choice: ScheduleChoice): ScheduleOption {
  const roll = rollD6() + rollD6();
  const sortedOptions = [...choice.options].sort((a, b) => b.weight - a.weight);

  let cumulative = 0;
  const thresholds = sortedOptions.map((opt) => {
    cumulative += opt.weight;
    return { option: opt, threshold: cumulative };
  });

  const normalizedRoll = (roll - 2) / 10;

  for (const { option, threshold } of thresholds) {
    if (normalizedRoll <= threshold) return option;
  }

  return sortedOptions[sortedOptions.length - 1];
}

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}
```

---

## 4. Conditions + Overrides

Conditions modify options (boost/reduce/block/require) and can also override a schedule entirely.

```typescript
export interface ChoiceCondition {
  type: ConditionType;
  modifier: 'boost' | 'reduce' | 'block' | 'require';
  factor?: number;
  params: Record<string, unknown>;
}

export type ConditionType =
  | 'weather'
  | 'relationship'
  | 'time-since-event'
  | 'npc-present'
  | 'flag'
  | 'affinity'
  | 'random';

export interface ScheduleOverride {
  condition: ChoiceCondition;
  behavior: OverrideBehavior;
}

export type OverrideBehavior =
  | { type: 'use-schedule'; scheduleId: string }
  | { type: 'stay-put'; activity: NpcActivity }
  | { type: 'go-to'; locationId: string; activity: NpcActivity }
  | { type: 'follow-npc'; targetNpcId: string }
  | { type: 'unavailable'; reason: string };
```

---

## 5. Templates

Templates reduce duplication ("shopkeeper daily", "guard patrol"), with per-NPC parameters and targeted overrides.

```typescript
export interface ScheduleTemplate {
  id: string;
  name: string;
  parameters: string[]; // e.g., ['workLocation', 'homeLocation']
  slots: ScheduleSlot[];
}

export interface NpcScheduleRef {
  templateId: string;
  parameterValues: Record<string, string>; // e.g., { workLocation: 'shop-01' }
  overrides?: Partial<ScheduleSlot>[]; // Slot-level tweaks
}
```

---

## 6. Character Profile Integration

Character profiles should reference a schedule (either embedded or by id):

```typescript
export interface CharacterScheduleFields {
  /** Inline schedule definition */
  schedule?: NpcSchedule;

  /** Reference to a shared schedule by ID */
  scheduleId?: string;

  /** Default home location (used by templates) */
  homeLocationId?: string;

  /** Default work location (used by templates) */
  workLocationId?: string;
}
```

---

## 7. Open Questions

1. **Authoring**: JSON-only for now, timeline editor later?
2. **Conflicts**: Formalize "schedule pressure" vs always-interruptible?
3. **Validation**: What invariants should the schema enforce (no overlapping slots, weights sum, etc.)?
4. **Sleep Interruption**: Major NPCs can be woken; minor/transient unavailable unless same room.

---

## 8. Related Documents

- [05-locations-schema.md](05-locations-schema.md) - Location data model
- [18-multi-npc-sessions-and-state.md](18-multi-npc-sessions-and-state.md) - Multi-NPC sessions
- [26-time-system.md](26-time-system.md) - Time system
- [28-affinity-and-relationship-dynamics.md](28-affinity-and-relationship-dynamics.md) - Relationship systems
- [29-time-triggered-behaviors.md](29-time-triggered-behaviors.md) - Time-aware NPC behaviors
- [30-npc-tiers-and-promotion.md](30-npc-tiers-and-promotion.md) - NPC tier system
- [31-npc-simulation-and-performance.md](31-npc-simulation-and-performance.md) - Simulation engine
- [32-npc-encounters-and-occupancy.md](32-npc-encounters-and-occupancy.md) - Encounter generation
