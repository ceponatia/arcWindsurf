# Living World Game Loop System

**Status**: Draft
**Created**: January 21, 2026
**Reference**: [008-improvements-roadmap.md](../../008-improvements-roadmap.md) (Section 3)
**Depends On**: [001-world-bus-backend](../../001-world-bus-backend/) (Phases 1-3 complete)

---

## Executive Summary

This plan defines the integration layer between the **chat experience** (Character Studio / game sessions) and the **living world simulation** (WorldBus, NPC actors, time system). The goal is to create a seamless experience where:

1. Player chat messages become game actions (SPEAK_INTENT, MOVE_INTENT, etc.)
2. The focused NPC responds via LLM
3. Background NPCs in proximity update via the simulation layer
4. Ambient narration weaves background events into the chat stream
5. Game time advances per chat turn, driving schedule-based NPC behavior

---

## Current State Analysis

### What Exists (Complete)

| Component                                           | Package                    | Status   |
| --------------------------------------------------- | -------------------------- | -------- |
| WorldBus core                                       | `@minimal-rpg/bus`         | ✅ Ready |
| Event schemas (SPOKE, MOVED, TICK, etc.)            | `@minimal-rpg/schemas`     | ✅ Ready |
| NPC Actor with XState machine                       | `@minimal-rpg/actors`      | ✅ Ready |
| Cognition Layer (rule-based + LLM wiring)           | `@minimal-rpg/actors`      | ✅ Ready |
| LLM Provider abstraction                            | `@minimal-rpg/llm`         | ✅ Ready |
| System services (Time, Location, Dialogue, Physics) | `@minimal-rpg/services`    | ✅ Ready |
| Projection system                                   | `@minimal-rpg/projections` | ✅ Ready |
| Encounter narration (background NPC descriptions)   | `@minimal-rpg/services`    | ✅ Ready |
| NPC tier system (major/minor/background/transient)  | `@minimal-rpg/schemas`     | ✅ Ready |
| SSE streaming endpoint                              | `@minimal-rpg/api`         | ✅ Ready |

### What's Missing (To Be Built)

| Component                           | Gap                                                     |
| ----------------------------------- | ------------------------------------------------------- |
| **Chat → Intent Parser**            | No system to convert natural language into game intents |
| **Turn-Based Time Controller**      | Time advances arbitrarily, not per chat turn            |
| **Ambient Narrator**                | Background events don't weave into chat stream          |
| **Proximity Interjection Logic**    | No intelligent filtering for when NPCs should speak     |
| **Session Game State Orchestrator** | No unified coordinator between chat and simulation      |
| **Client Event Renderer**           | Frontend doesn't consume WorldBus events for narration  |

---

## System Architecture

### High-Level Flow

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              GAME SESSION                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Chat Interface                                  │ │
│  │  Player: "I'd like to head to the tavern now"                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     Intent Parser (LLM)                                 │ │
│  │  Detects: MOVE_INTENT + SPEAK_INTENT                                   │ │
│  │  Output: { actions: [MOVE to 'tavern'], dialogue: "..." }              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│            ┌───────────────────────┴───────────────────────┐                 │
│            ▼                                               ▼                 │
│  ┌─────────────────────┐                     ┌─────────────────────┐         │
│  │    WorldBus         │                     │   Focused NPC       │         │
│  │  (emit events)      │                     │   LLM Response      │         │
│  └─────────────────────┘                     └─────────────────────┘         │
│            │                                               │                 │
│            ▼                                               ▼                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      Turn Orchestrator                                  │ │
│  │  1. Advance game time by configured interval                           │ │
│  │  2. Trigger NPC schedule updates                                       │ │
│  │  3. Collect ambient events from background NPCs                        │ │
│  │  4. Weave narration into response stream                               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Chat Response                                   │ │
│  │  Elara nods. "The tavern? I'll walk with you."                         │ │
│  │  *You head toward the tavern. A couple at a corner table holds hands   │ │
│  │  over their plates. The bartender polishes a glass, watching you enter.*│ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              @minimal-rpg/api                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │ POST /game/turn  │  │ GET /stream/:id  │  │ POST /game/start │           │
│  │                  │  │     (SSE)        │  │                  │           │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘           │
│           │                     │                     │                     │
│           └──────────────┬──────┴─────────────────────┘                     │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     TurnOrchestrator (NEW)                              ││
│  │  - parseIntent(message) → Intent[]                                      ││
│  │  - advanceTime(minutes) → TICK events                                   ││
│  │  - collectAmbientEvents() → narration strings                           ││
│  │  - composeResponse(npcReply, ambient) → final chat message              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                │                           │
                ▼                           ▼
┌─────────────────────────────┐  ┌─────────────────────────────────┐
│     @minimal-rpg/bus        │  │     @minimal-rpg/actors         │
│  ┌────────────────────────┐ │  │  ┌────────────────────────────┐ │
│  │       WorldBus         │ │  │  │      ActorRegistry         │ │
│  │  - emit(event)         │ │  │  │  - spawn(config)           │ │
│  │  - subscribe(handler)  │◄├──├──►  - get(id)                 │ │
│  └────────────────────────┘ │  │  │  - sendToLocation(...)     │ │
└─────────────────────────────┘  │  └────────────────────────────┘ │
                │                │  ┌────────────────────────────┐ │
                │                │  │       NpcActor             │ │
                │                │  │  - state machine           │ │
                │                │  │  - LLM cognition           │ │
                ▼                │  └────────────────────────────┘ │
┌─────────────────────────────┐  └─────────────────────────────────┘
│   @minimal-rpg/services     │
│  ┌────────────────────────┐ │
│  │      TimeService       │ │
│  │  - advanceTime()       │ │
│  │  - getScheduledEvents()│ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │    DialogueService     │ │
│  │  - SPEAK_INTENT→SPOKE  │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │    ProximityService    │ │
│  │  - getNpcsInRange()    │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │   EncounterService     │ │
│  │  - generateNarration() │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

---

## Core Concepts

### 1. Turn-Based Time Model

Each chat exchange (player message + NPC response) constitutes a **turn**. Time advances by a configurable interval after each turn.

```typescript
interface TurnConfig {
  /** Game minutes per turn (default: 5) */
  minutesPerTurn: number;
  /** Whether background NPCs update during turns */
  enableAmbientUpdates: boolean;
  /** How many background events to include per turn (0 = none) */
  maxAmbientNarrations: number;
}
```

**Time flow:**

1. Player sends message
2. Intent parser extracts actions
3. Actions emit to WorldBus (SPEAK_INTENT, MOVE_INTENT, etc.)
4. System services resolve intents → effects (SPOKE, MOVED)
5. Time advances by `minutesPerTurn`
6. Scheduler checks for triggered NPC schedule changes
7. Background NPCs update state (async, batched)
8. Ambient narrator collects notable events
9. Focused NPC generates LLM response
10. Final response = NPC dialogue + ambient narration

### 2. Intent Parsing

The player's natural language input must be parsed into game intents. This uses the LLM with structured output.

```typescript
interface ParsedTurn {
  /** Primary action the player wants to take */
  primaryIntent: Intent | null;
  /** What the player said (if anything) */
  spokenContent: string | null;
  /** Secondary actions (examine, take, etc.) */
  secondaryIntents: Intent[];
  /** Metadata for response generation */
  meta: {
    isQuestion: boolean;
    mentionedNpcs: string[];
    mentionedLocations: string[];
  };
}
```

**Examples:**

| Player Input                                   | Parsed Output                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| "I walk to the tavern"                         | `{ primaryIntent: MOVE_INTENT(tavern), spokenContent: null }`                 |
| "Hello there!"                                 | `{ primaryIntent: null, spokenContent: "Hello there!" }`                      |
| "Let's head to the market. What do you think?" | `{ primaryIntent: MOVE_INTENT(market), spokenContent: "What do you think?" }` |
| "I examine the sword"                          | `{ primaryIntent: EXAMINE_INTENT(sword), spokenContent: null }`               |

### 3. Proximity-Aware Interjection

NPCs in the same location can interject when **contextually relevant**. The system uses:

1. **NPC Tier**: Only `major` and `minor` NPCs can interject
2. **Relevance Score**: LLM-based scoring of whether the conversation topic is relevant
3. **Social Context**: NPCs engaged in their own activities (absorbed, focused) less likely to interject
4. **Cooldown**: NPCs that recently spoke have lower priority

```typescript
interface InterjectionCandidate {
  npcId: string;
  tier: 'major' | 'minor';
  relevanceScore: number; // 0-1
  engagement: 'idle' | 'casual' | 'focused' | 'absorbed';
  lastSpokeAt: Date | null;
}

function shouldInterject(candidate: InterjectionCandidate): boolean {
  const baseThreshold = candidate.tier === 'major' ? 0.6 : 0.8;
  const engagementPenalty = {
    idle: 0,
    casual: 0.1,
    focused: 0.3,
    absorbed: 0.5,
  }[candidate.engagement];

  return candidate.relevanceScore > baseThreshold + engagementPenalty;
}
```

### 4. Ambient Narration

Background NPCs and world events are woven into the response as **italicized narration**, distinct from dialogue.

```typescript
interface AmbientEvent {
  type: 'npc-action' | 'world-event' | 'atmosphere';
  narration: string;
  priority: number; // Higher = more likely to include
  timestamp: Date;
}

// Example ambient events:
// - NPC entered location: "*The tavern door swings open as a hooded figure enters.*"
// - NPC activity: "*A couple in the corner shares a quiet laugh over their wine.*"
// - World event: "*Thunder rumbles in the distance.*"
```

### 5. Response Composition

The final response combines multiple sources:

```typescript
interface ComposedResponse {
  /** The focused NPC's dialogue (if any) */
  npcDialogue: string | null;
  /** Interjections from nearby NPCs */
  interjections: { npcId: string; name: string; content: string }[];
  /** Ambient narration (italicized) */
  ambientNarration: string[];
  /** Location transition narration (if player moved) */
  transitionNarration: string | null;
  /** Final formatted string for chat display */
  formatted: string;
}
```

**Composition order:**

1. Transition narration (if MOVED)
2. Scene description (if new location)
3. Ambient narration (background activity)
4. NPC interjections (if any)
5. Focused NPC dialogue

---

## Improvements Over Roadmap Section 3

### 3.1 Event-Sourced World State

**Roadmap suggestion:** Event handlers that rebuild state.

**Enhancement:**

- Add **event causality tracking** (`causedByEventId`) to link player actions to world reactions
- Implement **selective replay** - only replay relevant projection domains per request
- Add **event deduplication** for the same logical action (e.g., MOVE_INTENT + MOVED from same action)

### 3.2 NPC Autonomy via Actor Model

**Roadmap suggestion:** Wire actors to sessions.

**Enhancement:**

- Implement **lazy actor spawning** - only spawn NPC actors when player enters their location
- Add **hibernation** for actors when player leaves (stop machine, preserve state)
- Use **batched async cognition** for background NPCs (group LLM calls)

### 3.3 Location Graph Navigation

**Roadmap suggestion:** Interactive navigation UI.

**Enhancement:**

- Navigation should work via **natural language** ("I go to the tavern") not just clicking
- Support **implicit movement** during dialogue ("Let's walk and talk" → continuous location updates)
- Add **travel time narration** for non-instant moves

### 3.4 Time System & NPC Schedules

**Roadmap suggestion:** Time advancement UI.

**Enhancement:**

- Time should advance **automatically per turn**, not via manual UI controls
- Add **configurable turn duration** per session type (combat: 6 seconds, exploration: 5 minutes, long-form: 1 hour)
- Implement **time skip** command for "wait until evening" scenarios

### 3.5 Turn-Based vs Real-Time Modes

**Roadmap suggestion:** Support both play styles.

**Enhancement:**

- Default to **turn-based** with automatic time advancement
- Real-time should be **opt-in** and primarily for "waiting" scenarios
- Add **speed controls** instead of binary modes (1x, 2x, 5x time passage)

---

## New Concepts Not in Roadmap

### 1. Conversation Context Window

Maintain a **sliding window of recent events** for context injection into LLM prompts:

```typescript
interface ConversationContext {
  /** Recent chat messages (player + NPC) */
  recentDialogue: ChatMessage[];
  /** Recent world events (MOVED, ITEM_ACQUIRED, etc.) */
  recentEvents: WorldEvent[];
  /** NPCs the player has interacted with this session */
  encounteredNpcs: Set<string>;
  /** Current narrative summary (updated every N turns) */
  narrativeSummary: string;
}
```

### 2. Narrative Mode Toggle

Allow players to adjust the verbosity of ambient narration:

```typescript
type NarrativeMode = 'minimal' | 'standard' | 'verbose';

// minimal: Only dialogue, minimal scene-setting
// standard: Dialogue + notable ambient events
// verbose: Rich descriptions, more background detail
```

### 3. Action Confirmation for Risky Moves

Before executing certain intents, the system can ask for confirmation:

```typescript
interface ActionConfirmation {
  intent: Intent;
  reason: string;
  options: ('proceed' | 'cancel' | 'modify')[];
}

// Example: "Leave the tavern? Elara is in the middle of telling you something important."
```

### 4. Multi-NPC Conversations

Support scenes with multiple NPCs without requiring the player to @mention:

```typescript
interface ConversationParticipants {
  focused: string; // Primary NPC
  active: string[]; // NPCs who can respond directly
  observers: string[]; // NPCs who might react but not speak
}
```

---

## Implementation Tasks

### Phase 0: Schema Updates

| Task     | Priority | Estimate | Description                     |
| -------- | -------- | -------- | ------------------------------- |
| TASK-006 | P1       | 2h       | Add `state_changes` table       |
| TASK-007 | P1       | 1h       | Add session mode to projections |

### Phase 1: Core Integration (3-4 days)

| Task     | Priority | Estimate | Description                                     |
| -------- | -------- | -------- | ----------------------------------------------- |
| TASK-001 | P0       | 4h       | Create `TurnOrchestrator` service               |
| TASK-002 | P0       | 4h       | Implement `IntentParser` with LLM               |
| TASK-003 | P0       | 3h       | Wire turn orchestrator to `/game/turn` endpoint |
| TASK-008 | P1       | 2h       | Add turn-based time advancement                 |

### Phase 2: Ambient System (2-3 days)

| Task     | Priority | Estimate | Description                          |
| -------- | -------- | -------- | ------------------------------------ |
| TASK-004 | P0       | 4h       | Implement `AmbientCollector` service |
| TASK-005 | P0       | 3h       | Add proximity interjection logic     |
| TASK-009 | P1       | 2h       | Implement response composer          |
| TASK-010 | P1       | 2h       | Add narrative mode toggle            |

### Phase 3: Actor Lifecycle (2 days)

| Task     | Priority | Estimate | Description                                |
| -------- | -------- | -------- | ------------------------------------------ |
| TASK-011 | P1       | 3h       | Implement lazy actor spawning              |
| TASK-012 | P1       | 2h       | Add actor hibernation on player departure  |
| TASK-013 | P2       | 3h       | Implement batched background NPC cognition |

### Phase 4: Frontend Integration (2 days)

| Task     | Priority | Estimate | Description                        |
| -------- | -------- | -------- | ---------------------------------- |
| TASK-014 | P0       | 4h       | Create game session chat component |
| TASK-015 | P1       | 3h       | Add ambient narration rendering    |
| TASK-016 | P2       | 2h       | Add location transition animations |

---

## Resolved Questions

### 1. Player Character Profile ✅

**Decision**: Players use the **Persona schema** (`PersonaProfileSchema`).

Unlike NPC `CharacterProfile`, the persona schema:

- Omits personality fields (player controls their own behavior)
- Focuses on identity: `name`, `age`, `summary`
- Includes optional `appearance` (structured or free-text)
- Includes optional `body` map for sensory descriptions

**Integration**:

- Load persona at session start via `sessionParticipants.actorId` → `entityProfiles`
- Include persona in LLM context for NPC perception of the player
- NPCs can reference player appearance, name, observable traits

```typescript
// Persona context injection for NPC prompts
interface PlayerContext {
  name: string;
  appearance?: string; // Summarized from PersonaAppearance
  observableTraits: string[]; // Derived from body map
}
```

### 2. Simultaneous Conversations ✅

**Decision**: Yes, NPCs are aware when the player is occupied.

**Implementation**:

- Track `focusedNpcId` in session state
- Interjection scorer receives `isPlayerOccupied: boolean`
- When occupied, raise interjection threshold significantly
- Exception: NPCs mentioned by name can still interject

```typescript
// In InterjectionScorer
if (context.isPlayerOccupied && !context.mentionedNpcs.includes(candidate.npcId)) {
  // Raise threshold by 0.3 when player is in conversation
  threshold += 0.3;
}
```

### 3. Combat Integration ✅

**Decision**: Yes, combat uses a separate turn system.

**Turn Duration by Mode**:

| Mode        | Turn Duration | Time Advancement       |
| ----------- | ------------- | ---------------------- |
| Exploration | 5 minutes     | Per chat turn          |
| Social      | 1-2 minutes   | Per chat turn          |
| Combat      | 6 seconds     | Per combat round       |
| Long-form   | 1 hour        | Per scene/chapter skip |

**Implementation**:

- Add `sessionMode: 'exploration' | 'social' | 'combat' | 'longform'` to session state
- TurnOrchestrator reads mode and adjusts `minutesPerTurn`
- Combat mode triggers different NPC cognition (tactical vs social)
- Mode transitions emit `MODE_CHANGE` event

### 4. Save/Load ✅

**Decision**: Hybrid approach - events for replay, snapshots for efficiency.

**Strategy**:

- **Events table** stores all significant events (SPOKE, MOVED, etc.)
- **actorStates table** stores periodic NPC state snapshots
- On load: restore from latest snapshot, then replay events since `lastEventSeq`

This is already supported by the existing schema.

### 5. Persistence Granularity ✅

**Decision**: Use tiered persistence with a separate **state changes** table.

See detailed analysis below.

---

## Persistence Architecture

### Problem

Background NPCs generate many state changes (location, activity, engagement) that:

- Need to be tracked for world consistency
- Should NOT bloat the main `events` table
- May be useful for "rewind" or debugging
- Are mostly ephemeral (don't need indefinite retention)

### Solution: Tiered Persistence

**Tier 1: Events Table** (existing)

- All player actions
- All major/minor NPC actions
- System events (TICK, SESSION_START, etc.)
- Permanent retention within session

**Tier 2: Actor States Table** (existing)

- Periodic snapshots of NPC XState machine state
- Updated on significant state changes
- Used for fast session restore

**Tier 3: State Changes Table** (NEW)

- Background NPC state deltas
- High-frequency, low-importance changes
- Ephemeral - can be pruned after N hours or on session save

```sql
CREATE TABLE state_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_tier TEXT NOT NULL, -- 'major', 'minor', 'background', 'transient'
  change_type TEXT NOT NULL, -- 'location', 'activity', 'engagement', 'schedule'
  previous_value JSONB,
  new_value JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for efficient queries by session and actor
CREATE INDEX idx_state_changes_session_actor ON state_changes(session_id, actor_id);
-- Index for pruning old changes
CREATE INDEX idx_state_changes_timestamp ON state_changes(timestamp);
```

### Persistence Rules by Tier

| NPC Tier   | Events Table | Actor States | State Changes |
| ---------- | ------------ | ------------ | ------------- |
| Major      | ✅ All       | ✅ Snapshots | ❌ N/A        |
| Minor      | ✅ All       | ✅ Snapshots | ❌ N/A        |
| Background | ❌ None      | ✅ Snapshots | ✅ All        |
| Transient  | ❌ None      | ❌ None      | ❌ None       |

### State Change Lifecycle

```text
1. Background NPC changes activity
   └─► StateChangeService.record({ actorId, changeType, newValue })

2. State change written to state_changes table
   └─► No WorldBus emit (avoid event storm)

3. AmbientCollector queries recent state_changes for narration
   └─► "The bartender begins wiping down the counter"

4. On session save: prune state_changes older than 1 hour
   └─► Keep final state in actor_states snapshot

5. On session load: ignore state_changes, restore from actor_states
```

### Benefits

- **Events table stays lean**: Only meaningful, replayable events
- **World feels alive**: Background state changes can still be narrated
- **Debugging supported**: Recent changes queryable for troubleshooting
- **Scalable**: Ephemeral storage pruned automatically

---

## Technical Considerations

### Performance

- **LLM Calls**: Intent parsing + focused NPC response + relevance scoring = 2-4 LLM calls per turn. Consider batching or tiered models.
- **Actor Count**: Large locations may have 10+ NPCs. Use lazy spawning and hibernation to limit active actors.
- **Event Volume**: Background NPCs can generate many events. Filter before persisting.

### Consistency

- **Event Ordering**: Use sequence numbers and causal links to ensure deterministic replay.
- **Time Sync**: Game time must be consistent across all components (projections, actors, services).

### Extensibility

- **Custom Intents**: The intent parser should be extensible for game-specific actions.
- **Ambient Sources**: Allow plugins to inject ambient events (weather, quest triggers, etc.).

---

## Next Steps

1. Review this plan and clarify open questions
2. Create detailed task files for Phase 1
3. Begin implementation of `TurnOrchestrator`

---

## Appendix: Event Flow Example

**Scenario**: Player in tavern, talking to Elara. Background NPC (bartender) present.

```text
1. Player: "Let's head to the market. I need to buy supplies."

2. IntentParser detects:
   - MOVE_INTENT(market)
   - SPEAK_INTENT("Let's head to the market. I need to buy supplies.")

3. WorldBus receives:
   - SPEAK_INTENT { actorId: "player", content: "...", targetActorId: "elara" }
   - MOVE_INTENT { actorId: "player", destinationId: "market" }

4. DialogueService converts:
   - SPEAK_INTENT → SPOKE effect

5. LocationService resolves:
   - MOVE_INTENT → MOVED effect (after validation)

6. TimeService advances:
   - +5 minutes → TICK event

7. Scheduler checks:
   - Bartender schedule: no change
   - Elara schedule: follows player (has FOLLOW behavior)

8. AmbientCollector gathers:
   - Bartender waves goodbye
   - Market scene description

9. FocusedNPC (Elara) generates:
   - "The market? I could use some fresh air. Lead the way."

10. ResponseComposer formats:
    "*You leave the tavern, the bartender nodding as you pass. The market
    square bustles with midday activity—merchants calling out their wares,
    children darting between stalls.*

    Elara falls into step beside you. 'The market? I could use some fresh
    air. Lead the way.'"
```
