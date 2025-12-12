# NPC Encounters and Occupancy

> **Status**: BRAINSTORM
> **Last Updated**: December 2025

This document covers how NPCs are encountered when the player enters a location, including occupancy calculation and LLM narration guidance.

Split from [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md).

## 1. Location Occupancy Model

When the player enters a location, we determine which NPCs are present, who recently left, and who might arrive soon.

### 1.1 Occupancy Data Structures

```typescript
export interface LocationOccupancy {
  /** NPCs currently at this location */
  present: PresentNpc[];

  /** NPCs who recently left */
  recentlyLeft: RecentDeparture[];

  /** NPCs expected to arrive soon */
  expectedArrivals: ExpectedArrival[];
}

export interface PresentNpc {
  npcId: string;
  activity: NpcActivity;
  arrivedAt: GameTime;
  proximity: NpcProximity;
}

export interface RecentDeparture {
  npcId: string;
  leftAt: GameTime;
  destination: string;
}

export interface ExpectedArrival {
  npcId: string;
  expectedAt: GameTime;
  fromLocation: string;
}
```

### 1.2 Occupancy Calculation

```typescript
/**
 * Get all NPCs at a location at a given time.
 */
export function getLocationOccupancy(locationId: string, currentTime: GameTime): LocationOccupancy {
  const allNpcs = getAllNpcsInSession();
  const present: PresentNpc[] = [];
  const recentlyLeft: RecentDeparture[] = [];
  const expectedArrivals: ExpectedArrival[] = [];

  for (const npc of allNpcs) {
    const state = getNpcState(npc.id, currentTime);

    if (state.locationId === locationId) {
      present.push({
        npcId: npc.id,
        activity: state.activity,
        arrivedAt: state.arrivedAt,
        proximity: 'same-room', // Or compute based on subLocationId
      });
    } else {
      // Check if they were here recently
      const schedule = loadSchedule(npc.scheduleId);
      const previousSlot = getSlotBefore(schedule, currentTime);
      if (previousSlot && resolveSlotLocation(previousSlot) === locationId) {
        recentlyLeft.push({
          npcId: npc.id,
          leftAt: slotEndToGameTime(previousSlot, currentTime.day),
          destination: state.locationId,
        });
      }

      // Check if they're expected soon
      const nextSlot = getSlotAfter(schedule, currentTime);
      if (nextSlot && resolveSlotLocation(nextSlot) === locationId) {
        expectedArrivals.push({
          npcId: npc.id,
          expectedAt: slotStartToGameTime(nextSlot, currentTime.day),
          fromLocation: state.locationId,
        });
      }
    }
  }

  return { present, recentlyLeft, expectedArrivals };
}
```

## 2. Crowd Level Classification

```typescript
export type CrowdLevel = 'empty' | 'sparse' | 'moderate' | 'crowded' | 'packed';

export function categorizeCrowdLevel(presentCount: number, locationCapacity?: number): CrowdLevel {
  // If we know the location's capacity, use percentage
  if (locationCapacity) {
    const ratio = presentCount / locationCapacity;
    if (ratio === 0) return 'empty';
    if (ratio < 0.2) return 'sparse';
    if (ratio < 0.5) return 'moderate';
    if (ratio < 0.8) return 'crowded';
    return 'packed';
  }

  // Fallback to absolute numbers
  if (presentCount === 0) return 'empty';
  if (presentCount <= 3) return 'sparse';
  if (presentCount <= 8) return 'moderate';
  if (presentCount <= 15) return 'crowded';
  return 'packed';
}
```

## 3. LLM Narration Guidance

> **PM Notes**: We want to avoid having hard-coded responses as much as possible so these should just be examples for how the LLM should behave, not verbatim how it should respond, right?

Correct - occupancy data is passed to the LLM as structured context, not scripts.

### 3.1 Building Occupancy Context

```typescript
/**
 * Build occupancy context for LLM prompt injection.
 * This is data, not prose - the LLM writes the prose.
 */
export function buildOccupancyContext(occupancy: LocationOccupancy): OccupancyPromptContext {
  return {
    presentNpcs: occupancy.present.map((p) => ({
      name: getNpcName(p.npcId),
      activity: p.activity.description,
      engagement: p.activity.engagement,
      tier: getNpcTier(p.npcId),
    })),

    recentDepartures: occupancy.recentlyLeft.map((d) => ({
      name: getNpcName(d.npcId),
      leftMinutesAgo: calculateMinutesAgo(d.leftAt),
      destination: getLocationName(d.destination),
    })),

    expectedArrivals: occupancy.expectedArrivals.map((a) => ({
      name: getNpcName(a.npcId),
      arrivingInMinutes: calculateMinutesUntil(a.expectedAt),
      comingFrom: getLocationName(a.fromLocation),
    })),

    crowdLevel: categorizeCrowdLevel(occupancy.present.length),

    // Hints for the LLM, not scripts
    narrativeHints: {
      shouldMentionCrowd: occupancy.present.length > 3,
      shouldMentionDeparture: occupancy.recentlyLeft.some(
        (d) => calculateMinutesAgo(d.leftAt) < 5 && getNpcTier(d.npcId) !== 'transient'
      ),
      shouldHintArrival: occupancy.expectedArrivals.some(
        (a) => calculateMinutesUntil(a.expectedAt) < 10 && getNpcTier(a.npcId) === 'major'
      ),
    },
  };
}
```

### 3.2 Prompt Injection Example

```typescript
const promptContext = `
[Location: The Rusty Anchor Tavern]
[Crowd Level: Moderate - about a dozen patrons]
[Present NPCs of Note: 
  - Marcus the bartender (tending bar, casually engaged)
  - Elena (sitting alone by the window, reading, focused)
]
[Recent: A group of sailors left about 5 minutes ago]
[Expected: Captain Vance usually arrives around this time]

Describe the scene naturally as the player enters. Don't list NPCs mechanically - weave their presence into the atmosphere.
`;
```

### 3.3 Example LLM Output

The LLM might generate:

> _The Rusty Anchor is comfortably busy tonight. Marcus gives you a nod from behind the bar, his hands never stopping their work on a row of tankards. A few tables are occupied by locals nursing their drinks, their conversations a low murmur beneath the crackle of the hearth. By the window, Elena sits alone with a book, seemingly oblivious to the world. You catch the lingering smell of salt and tobacco - sailors, recently departed. The door could swing open any moment - Captain Vance tends to show up around now._

### 3.4 Key Principles

This approach:

- Gives the LLM structured data
- Provides narrative hints (not scripts)
- Lets the LLM's creativity shine
- Maintains consistency without rigidity

## 4. NPC Awareness States

When the player enters a location, NPCs may or may not notice them.

```typescript
export interface NpcAwareness {
  /** Whether the NPC has noticed the player */
  awarenessLevel: 'unaware' | 'peripheral' | 'noticed' | 'focused';

  /** How the NPC reacted upon noticing */
  reaction?: 'neutral' | 'pleased' | 'wary' | 'surprised' | 'hostile';

  /** Whether NPC will approach or wait */
  initiative: 'approach' | 'acknowledge' | 'ignore' | 'avoid';
}

/**
 * Determine how an NPC reacts when player enters their location.
 */
export function determineAwareness(
  npc: NpcInfo,
  player: PlayerInfo,
  affinity: AffinityScores
): NpcAwareness {
  // Base awareness on NPC's engagement level
  let awarenessLevel: NpcAwareness['awarenessLevel'];
  switch (npc.activity.engagement) {
    case 'absorbed':
      awarenessLevel = 'unaware'; // Too focused to notice
      break;
    case 'focused':
      awarenessLevel = 'peripheral'; // Might notice movement
      break;
    case 'casual':
    case 'idle':
      awarenessLevel = 'noticed'; // Will see player enter
      break;
  }

  // High affinity NPCs notice player more readily
  if (affinity.fondness > 50 || affinity.attraction > 50) {
    awarenessLevel = 'focused';
  }

  // Determine reaction based on affinity
  let reaction: NpcAwareness['reaction'] = 'neutral';
  if (affinity.fondness > 30) reaction = 'pleased';
  if (affinity.fondness < -30) reaction = 'wary';
  if (affinity.fear > 50) reaction = 'hostile';

  // Determine initiative
  let initiative: NpcAwareness['initiative'] = 'acknowledge';
  if (affinity.fondness > 60) initiative = 'approach';
  if (affinity.fondness < -20 || affinity.fear > 30) initiative = 'avoid';
  if (awarenessLevel === 'unaware') initiative = 'ignore';

  return { awarenessLevel, reaction, initiative };
}
```

## 5. NPC-NPC Co-Location

> **PM Notes on NPC-NPC Interactions**: I was thinking of creating a system where npc's could take turns inside one turn but it would have to be tightly managed. Perhaps each npc gets one turn before the player does, depending on the action. They could speak to one another and do minor actions like taking a drink, but couldn't drive to work and start working, then go on their lunch break, all before the player gets their turn.

### 5.1 Options for NPC-NPC Interaction

**Option A: Background Flavor Only**
NPCs at same location are described as interacting, but we don't simulate the conversation.

```text
"Marcus and Elena are chatting by the bar."
```

**Option B: Lightweight Simulation**
For major NPCs, generate 1-2 lines of dialogue/action per turn when co-located. No LLM call - use templates or relationship-based snippets.

```typescript
const npcInteractionSnippets = {
  friendly: [
    '{npc1} laughs at something {npc2} said.',
    '{npc1} and {npc2} are deep in conversation.',
  ],
  neutral: ['{npc1} nods politely at {npc2}.', '{npc1} and {npc2} exchange a few words.'],
  hostile: [
    '{npc1} pointedly ignores {npc2}.',
    'There is a tense silence between {npc1} and {npc2}.',
  ],
};
```

**Option C: Full NPC Turns** (expensive)
Each major NPC gets a mini-turn. Only for important scenes.

### 5.2 Resolved Questions

> **PM Notes**: Do NPC-NPC interactions affect affinity between them?
> _Maybe in the future but not right now. Affinity is only between player and NPCs_
> **PM Notes**: Can the player overhear NPC conversations? (Eavesdropping mechanic)
> _Yes_
> **PM Notes**: Should this only happen for major NPCs, or minor too?
> _Only major for now_

### 5.3 Eavesdropping Mechanic

When two major NPCs are co-located and the player is present but not engaged:

```typescript
export interface EavesdropContext {
  /** The NPCs having the conversation */
  participants: string[];

  /** Topic of conversation (for LLM prompt) */
  topic?: string;

  /** Relationship between the NPCs */
  relationship: 'friendly' | 'neutral' | 'tense' | 'hostile';

  /** Can player hear clearly? */
  audibility: 'clear' | 'muffled' | 'fragments';
}

function determineAudibility(
  playerProximity: InteractionProximity,
  crowdLevel: CrowdLevel
): EavesdropContext['audibility'] {
  if (playerProximity === 'close' || playerProximity === 'near') {
    return crowdLevel === 'packed' ? 'muffled' : 'clear';
  }
  if (playerProximity === 'far') {
    return 'fragments';
  }
  return 'muffled';
}
```

## 6. Sleep and Unavailability

> **PM Notes**: Major NPCs should be able to be woken up and they'd react in character based on affinity, relationship, etc. Minor and transient NPCs would simply be unavailable (unless they were for some reason sleeping in the same room as the player is located)

### 6.1 Unavailability Rules

```typescript
export type UnavailabilityReason = 'sleeping' | 'traveling' | 'busy' | 'inaccessible';

export interface NpcAvailability {
  available: boolean;
  reason?: UnavailabilityReason;
  canOverride: boolean;
  overrideConsequences?: string;
}

/**
 * Determine if an NPC can be interacted with.
 */
export function checkAvailability(
  npc: NpcInfo,
  state: NpcLocationState,
  playerLocation: string
): NpcAvailability {
  // Sleeping check
  if (state.activity.type === 'sleeping') {
    const sameLocation = state.locationId === playerLocation;

    if (npc.tier === 'major') {
      return {
        available: false,
        reason: 'sleeping',
        canOverride: true,
        overrideConsequences: 'They will be woken and may react based on relationship',
      };
    }

    if (npc.tier === 'minor' && sameLocation) {
      return {
        available: false,
        reason: 'sleeping',
        canOverride: true,
        overrideConsequences: 'You can wake them, but they may be grumpy',
      };
    }

    return {
      available: false,
      reason: 'sleeping',
      canOverride: false,
    };
  }

  // Traveling check
  if (state.activity.type === 'traveling') {
    return {
      available: false,
      reason: 'traveling',
      canOverride: false,
    };
  }

  // Absorbed in activity
  if (state.activity.engagement === 'absorbed') {
    return {
      available: true, // Can interrupt, but...
      reason: 'busy',
      canOverride: true,
      overrideConsequences: 'Interrupting may annoy them',
    };
  }

  return { available: true };
}
```

### 6.2 Waking Up Reactions

For major NPCs that are woken:

```typescript
export interface WakeUpReaction {
  mood: 'groggy' | 'annoyed' | 'alarmed' | 'pleased' | 'angry';
  dialogue?: string; // Generated by LLM based on affinity
}

function determineWakeUpMood(
  affinity: AffinityScores,
  relationship: string,
  urgency: boolean
): WakeUpReaction['mood'] {
  // Close relationship + high affinity = more forgiving
  if (relationship === 'partner' || relationship === 'close_friend') {
    if (affinity.fondness > 60) return urgency ? 'alarmed' : 'pleased';
    return 'groggy';
  }

  // Low affinity = not happy about it
  if (affinity.fondness < 0) return 'angry';
  if (affinity.fondness < 30) return 'annoyed';

  return 'groggy';
}
```

## 7. Travel and Transit

> **PM Notes on Travel Time**: Major NPCs could have a field for when they need to leave to be somewhere (optional). I don't think this feature is very important right now.

For now, simplified approach:

- **Minor/Background NPCs**: Instant transition at slot boundaries
- **Major NPCs**: Implied travel, optionally tracked

```typescript
type NpcTransitState =
  | { type: 'at-location'; locationId: string }
  | { type: 'in-transit'; from: string; to: string; eta: GameTime };

// For future: Could allow "catch them on the way"
```

## 8. Memory and Continuity

> **PM Notes**: I like this functionality. Affinity score changes could adjust the next interaction's mood.

When loading occupancy, include recent interaction context:

```typescript
export interface NpcMoodContext {
  /** Base mood from schedule/activity */
  baseMood: string;

  /** Modifier from recent player interactions */
  recentInteractionEffect?: {
    event: string;
    turnsAgo: number;
    moodShift: 'positive' | 'negative' | 'neutral';
  };

  /** Resulting effective mood */
  effectiveMood: string;
}

function calculateEffectiveMood(
  npc: NpcInfo,
  recentInteractions: InteractionRecord[]
): NpcMoodContext {
  const baseMood = npc.activity.engagement === 'focused' ? 'busy' : 'relaxed';

  // Check for significant recent interactions
  const significant = recentInteractions.find(
    (i) => i.npcId === npc.id && i.turnsAgo < 100 && Math.abs(i.affinityDelta) > 10
  );

  if (!significant) {
    return { baseMood, effectiveMood: baseMood };
  }

  const moodShift = significant.affinityDelta > 0 ? 'positive' : 'negative';
  const effectiveMood =
    moodShift === 'positive' ? 'warm' : moodShift === 'negative' ? 'cool' : baseMood;

  return {
    baseMood,
    recentInteractionEffect: {
      event: significant.summary,
      turnsAgo: significant.turnsAgo,
      moodShift,
    },
    effectiveMood,
  };
}
```

## 9. Open Questions

1. **Sub-Location Proximity**: If an NPC is in a different room of the same building, should they appear in occupancy with reduced visibility?

2. **Dynamic Arrivals**: Should NPCs arrive during player's visit based on schedule? Or only on location re-entry?

3. **Crowd Composition**: Should background NPCs affect crowd level even if not individually tracked?

4. **Stealth/Hiding**: Can NPCs (or players) be at a location but hidden from occupancy?

## 10. Related Documents

- [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md) - Schedule system
- [30-npc-tiers-and-promotion.md](30-npc-tiers-and-promotion.md) - NPC tier definitions
- [31-npc-simulation-and-performance.md](31-npc-simulation-and-performance.md) - Simulation strategies
- [28-affinity-and-relationship-dynamics.md](28-affinity-and-relationship-dynamics.md) - Relationship system
