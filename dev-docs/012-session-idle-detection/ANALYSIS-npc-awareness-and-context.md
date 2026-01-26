# NPC Awareness and Context Analysis

## Problem Statement

When the system ran for a day without user interaction:

1. **NPCs talked to themselves randomly** - No awareness that the player wasn't responding
2. **Messages seemed disconnected** - NPCs didn't wonder about player silence
3. **Input token counts stayed constant** - Suggests chat history wasn't being included

This document analyzes the root causes and proposes solutions.

---

## Root Cause Analysis

### Issue 1: NPCs Have No Chat History

**Finding**: The NPC cognition system receives **only recent WorldBus events**, not chat history.

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Current NPC Context                          │
│                                                                 │
│   ✅ Last 5 WorldBus events (TICK, SPOKE, MOVED)               │
│   ✅ Character profile (name, traits, backstory)               │
│   ❌ No chat history from database                             │
│   ❌ No memory retrieval                                        │
│   ❌ No awareness of time since last player message            │
│   ❌ No awareness of conversation context                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence from code:**

```typescript
// packages/actors/src/npc/prompts.ts:32-41
lines.push('Recent events:');
if (perception.relevantEvents.length === 0) {
  lines.push('- None');
} else {
  perception.relevantEvents.slice(-5).forEach((event) => {
    const actorId = (event as Record<string, unknown>)['actorId'];
    lines.push(`- ${event.type} from ${actorId}`);
  });
}
```

The prompt only includes event types (TICK, SPOKE, MOVED) with actor IDs - not actual message content or conversation history.

```typescript
// packages/workers/src/processors/cognition.ts:27-36
const llmTask: LLMCognitionTask = {
  type: 'fast',
  messages: [
    {
      role: 'system',
      content: `You are NPC ${actorId}. Context: ${context.memoryContext ?? 'No memory'}.`,
    },
    ...context.lastEvents.map<LLMMessage>((event) => ({
      role: 'user',
      content: JSON.stringify(event),  // Raw event JSON, not conversation
    })),
  ],
};
```

**Result**: The LLM sees raw event JSON, not a coherent conversation. It has no idea what was said previously.

### Issue 2: No Player Presence Awareness

The NPC has no concept of:

- When the player last spoke
- How many turns have passed since player interaction
- Whether the player is even "in the room"

**Current perception only tracks:**

```typescript
// packages/actors/src/npc/types.ts:22-31
export interface PerceptionContext {
  relevantEvents: WorldEvent[];   // Last few events
  nearbyActors: string[];          // Who's nearby (from MOVED events)
  locationState?: unknown;         // Location data
}
```

There's no `lastPlayerInteractionTurn`, `turnsSincePlayerSpoke`, or `isPlayerPresent` field.

### Issue 3: Constant Input Token Count

**Finding**: `memoryContext` is always `undefined` because no memory retrieval happens.

```typescript
// packages/workers/src/processors/cognition.ts:30
content: `You are NPC ${actorId}. Context: ${context.memoryContext ?? 'No memory'}.`,
```

Since `memoryContext` is never populated, every call sends the same system prompt:
> "You are NPC [id]. Context: No memory."

Plus the same ~5 recent events (mostly TICK events), resulting in constant token count.

### Issue 4: TICK Events Trigger Infinite Chatter

The NPC state machine reacts to **every event**, including TICK:

```typescript
// packages/actors/src/npc/npc-machine.ts:29-35
states: {
  idle: {
    on: {
      WORLD_EVENT: {   // ANY event triggers cognition
        actions: 'bufferEvent',
        target: 'perceiving',
      },
    },
  },
  // ...
}
```

Since TICK events fire every second, and the cognition layer allows action on any relevant event:

```typescript
// packages/actors/src/npc/cognition.ts:109
if (context.perception.relevantEvents.length === 0) return null;
```

The NPC thinks "I have events, I should act" - even if those events are just TICKs with no player activity.

---

## Why This Doesn't Feel "Alive"

A real NPC would:

| Behavior | Current System | Expected Behavior |
|----------|----------------|-------------------|
| Player hasn't spoken in 5 turns | Keeps talking randomly | "Are you still there?" or goes quiet |
| Player leaves the location | Doesn't notice | "Where did they go?" |
| Long pause in conversation | Fills silence with non-sequiturs | Reflects, waits, or prompts player |
| Time passes | No concept of time | "It's getting late..." |
| Conversation context | None | Refers back to what was discussed |

The current system is a **reaction machine** that responds to events without:

- Temporal awareness (time, turns, pauses)
- Conversational memory (what was discussed)
- Social awareness (is the player engaged?)

---

## Proposed Solutions

### Solution 1: Add Player Activity Tracking to NPC State

Extend `NpcActorState` to track player engagement:

```typescript
// packages/actors/src/npc/types.ts

export interface NpcActorState extends BaseActorState {
  // ... existing fields ...

  // Player engagement tracking
  lastPlayerSpokeAt?: Date;
  turnsSincePlayerSpoke: number;
  lastPlayerInteractionTurn?: number;

  // Conversation awareness
  conversationTurnCount: number;
  hasActiveConversation: boolean;
}
```

Then in cognition:

```typescript
// When player speaks
if (event.type === 'SPOKE' && event.actorId.startsWith('player')) {
  state.lastPlayerSpokeAt = new Date();
  state.turnsSincePlayerSpoke = 0;
  state.hasActiveConversation = true;
}

// Each tick without player speech
if (event.type === 'TICK') {
  state.turnsSincePlayerSpoke++;

  // After 30 turns of silence, conversation ends
  if (state.turnsSincePlayerSpoke > 30) {
    state.hasActiveConversation = false;
  }
}
```

### Solution 2: Intelligent Idle Behavior

Replace constant chatter with contextual idle responses:

```typescript
// packages/actors/src/npc/cognition.ts

static async decideLLM(context: CognitionContext, profile: CharacterProfile, llmProvider: LLMProvider) {
  const { turnsSincePlayerSpoke, hasActiveConversation } = context.state;

  // No active conversation - NPC goes about their business quietly
  if (!hasActiveConversation) {
    // Only act on significant events (someone entering, time of day change)
    if (!this.isSignificantEvent(context.perception.relevantEvents)) {
      return null;
    }
  }

  // Player hasn't spoken in a while - prompt them or wonder aloud
  if (turnsSincePlayerSpoke > 10 && turnsSincePlayerSpoke < 20) {
    // Maybe say something like "You've gone quiet..."
    return this.generateIdlePrompt(context, profile, llmProvider);
  }

  // Long silence - stop initiating conversation
  if (turnsSincePlayerSpoke > 20) {
    return null;  // Wait for player to re-engage
  }

  // Normal conversation flow
  return this.generateResponse(context, profile, llmProvider);
}
```

### Solution 3: Fetch Chat History for Context

Add chat history retrieval before cognition:

```typescript
// packages/actors/src/npc/cognition.ts

static async decideLLM(context: CognitionContext, profile: CharacterProfile, llmProvider: LLMProvider) {
  // Fetch recent conversation from database
  const recentMessages = await getRecentSessionMessages(context.state.sessionId, {
    limit: 10,
    beforeTurn: context.state.currentTurn,
  });

  // Build conversation-aware prompt
  const prompt = buildNpcCognitionPrompt(context.perception, context.state, profile, {
    chatHistory: recentMessages,
    turnsSincePlayerSpoke: context.state.turnsSincePlayerSpoke,
  });

  // ...
}
```

Update the prompt builder:

```typescript
// packages/actors/src/npc/prompts.ts

export function buildNpcCognitionPrompt(
  perception: PerceptionContext,
  state: NpcActorState,
  profile: CharacterProfile,
  options?: { chatHistory?: Message[]; turnsSincePlayerSpoke?: number }
): string {
  const lines: string[] = [];

  // Character context
  lines.push(`NPC: ${profile.name ?? state.npcId}`);
  // ...existing profile fields...

  // Conversation context (NEW)
  if (options?.chatHistory?.length) {
    lines.push('');
    lines.push('Recent conversation:');
    options.chatHistory.forEach((msg) => {
      const speaker = msg.role === 'user' ? 'Player' : profile.name;
      lines.push(`${speaker}: ${msg.content}`);
    });
  }

  // Temporal awareness (NEW)
  if (options?.turnsSincePlayerSpoke !== undefined) {
    if (options.turnsSincePlayerSpoke > 5) {
      lines.push('');
      lines.push(`Note: The player has not spoken for ${options.turnsSincePlayerSpoke} turns.`);
    }
  }

  // Instruction
  lines.push('');
  lines.push('Instruction: Respond naturally. If the player has been silent, you may comment on it or wait.');

  return lines.join('\n');
}
```

### Solution 4: Don't Act on Every TICK

Add filtering for meaningful events:

```typescript
// packages/actors/src/npc/cognition.ts

static shouldAct(context: CognitionContext): boolean {
  const { relevantEvents } = context.perception;
  const { hasActiveConversation } = context.state;

  // No events at all - don't act
  if (relevantEvents.length === 0) return false;

  // Filter out TICK-only scenarios
  const nonTickEvents = relevantEvents.filter((e) => e.type !== 'TICK');

  // If only TICK events, only act if:
  // 1. We're in an active conversation AND
  // 2. Enough ticks have passed to warrant a prompt
  if (nonTickEvents.length === 0) {
    if (!hasActiveConversation) return false;

    // Only initiate every ~10 ticks at most
    const tickCount = relevantEvents.filter((e) => e.type === 'TICK').length;
    if (tickCount < 10) return false;
  }

  return true;
}
```

### Solution 5: Conversation State Machine

Instead of reacting to individual events, track conversation state:

```text
                    ┌──────────────────────┐
                    │        IDLE          │
                    │  (Not in convo)      │
                    └──────────┬───────────┘
                               │ Player speaks
                               ▼
                    ┌──────────────────────┐
       ┌───────────▶│      ENGAGED         │◀───────────┐
       │            │  (Active convo)      │            │
       │            └──────────┬───────────┘            │
       │                       │                        │
       │ Player speaks         │ 10+ turns silence     │ Player speaks
       │                       ▼                        │
       │            ┌──────────────────────┐            │
       │            │      WAITING         │────────────┘
       │            │  (Player gone quiet) │
       │            └──────────┬───────────┘
       │                       │ 30+ turns silence
       │                       ▼
       │            ┌──────────────────────┐
       └────────────│       IDLE           │
                    │  (Convo ended)       │
                    └──────────────────────┘
```

Behaviors by state:

| State | NPC Behavior |
|-------|--------------|
| IDLE | Occasional ambient actions, doesn't initiate |
| ENGAGED | Active conversation, responds to player |
| WAITING | May prompt player, then gradually disengages |

---

## Implementation Priority

### Phase 1: Quick Wins (Low Effort, High Impact)

1. **Filter TICK-only cognition** - Stop responding when only TICKs are present
2. **Track `turnsSincePlayerSpoke`** - Simple counter, no DB changes
3. **Update system prompt** - Add instruction about player silence

### Phase 2: Chat History Integration (Medium Effort)

1. **Fetch recent messages in cognition** - Query last N messages from `events` table
2. **Include in prompt** - Format as conversation for LLM context
3. **Implement sliding window** - Keep token count manageable

### Phase 3: Conversation State Machine (Higher Effort)

1. **Add conversation state to NPC machine** - XState transitions
2. **State-dependent behaviors** - Different prompts/actions per state
3. **Persistence** - Save/restore conversation state

---

## Summary

| Problem | Root Cause | Fix |
|---------|------------|-----|
| Random NPC chatter | Reacts to every TICK | Filter TICK-only scenarios |
| No player awareness | No tracking of player activity | Add `turnsSincePlayerSpoke` |
| Constant token count | No chat history fetched | Retrieve messages from DB |
| Disconnected responses | No conversation context | Include chat history in prompt |
| Doesn't feel alive | Reaction machine, no social awareness | Conversation state machine |

The heartbeat-based idle detection (from the previous document) will prevent inference when the player isn't viewing the session. This document addresses making NPC behavior feel more natural **when the player IS present but quiet**.

---

## Recommended Next Steps

1. Review and discuss proposed solutions
2. Implement Phase 1 quick wins (filter TICKs, track player activity)
3. Test NPC behavior with player silence scenarios
4. Implement Phase 2 (chat history) if Phase 1 isn't sufficient
5. Consider Phase 3 for fully "alive" NPCs
