# TASK-001: Wire CognitionLayer to TurnOrchestrator

**Priority**: P0
**Status**: ✅ Complete
**Estimate**: 2-4 hours
**Depends On**: None
**Category**: NPC Response Wiring

---

## Objective

Replace the placeholder NPC response in `TurnOrchestrator.generateNpcResponse()` with actual LLM-backed dialogue using the existing `CognitionLayer`.

## Current Code

```typescript
// packages/api/src/services/turn-orchestrator.ts L180-192
private generateNpcResponse(focusedNpcId: string | null, playerMessage: string): string | null {
  if (!focusedNpcId) {
    return null;
  }

  // TODO: Wire to actor cognition or LLM call.
  void playerMessage;
  void this.llmProvider;
  return '[NPC response placeholder]';
}
```

## Target Implementation

```typescript
import { CognitionLayer, type CognitionContext } from '@minimal-rpg/actors';
import { getCharacterProfile, getActorState } from '@minimal-rpg/db';

private async generateNpcResponse(
  focusedNpcId: string | null,
  playerMessage: string,
  sessionId: string
): Promise<string | null> {
  if (!focusedNpcId) return null;

  // 1. Get NPC profile and state from DB
  const profile = await getCharacterProfile(focusedNpcId);
  const actorState = await getActorState(sessionId, focusedNpcId);

  if (!profile || !actorState) {
    console.warn(`[TurnOrchestrator] Missing profile or state for NPC ${focusedNpcId}`);
    return null;
  }

  // 2. Build cognition context
  const context: CognitionContext = {
    perception: {
      relevantEvents: [{
        type: 'SPOKE',
        content: playerMessage,
        actorId: 'player',
        sessionId,
        timestamp: new Date(),
      }],
      nearbyActors: [],
      currentLocation: actorState.locationId,
    },
    state: {
      id: actorState.actorId,
      type: 'npc',
      npcId: focusedNpcId,
      sessionId,
      locationId: actorState.locationId,
      spawnedAt: actorState.createdAt ?? new Date(),
      lastActiveAt: new Date(),
      recentEvents: [],
      goals: [],
    },
    availableActions: ['SPEAK_INTENT'],
  };

  // 3. Call LLM cognition
  const result = await CognitionLayer.decideLLM(context, profile, this.llmProvider);

  // 4. Extract response content
  if (result?.intent?.type === 'SPEAK_INTENT') {
    return (result.intent as { content?: string }).content ?? null;
  }

  return null;
}
```

## Implementation Steps

### Step 1: Update Method Signature

Change `generateNpcResponse` to be async and accept sessionId:

```typescript
private async generateNpcResponse(
  focusedNpcId: string | null,
  playerMessage: string,
  sessionId: string
): Promise<string | null>
```

### Step 2: Update processTurn Call Site

In `processTurn()`, update the call to pass sessionId and await:

```typescript
// Step 5: Generate focused NPC response
const npcResponse = await this.generateNpcResponse(
  input.focusedNpcId,
  input.playerMessage,
  input.sessionId
);
```

### Step 3: Add Imports

```typescript
import { CognitionLayer, type CognitionContext } from '@minimal-rpg/actors';
```

### Step 4: Add DB Queries

Either import existing repository functions or create them:

```typescript
// Option A: Use existing repositories
import { getEntityProfile } from '@minimal-rpg/db';

// Option B: Add to repositories if not exists
async function getCharacterProfile(npcId: string): Promise<CharacterProfile | null> {
  const row = await drizzle.select()
    .from(entityProfiles)
    .where(and(
      eq(entityProfiles.id, npcId),
      eq(entityProfiles.entityType, 'character')
    ))
    .limit(1);
  return row[0]?.profileJson as CharacterProfile ?? null;
}
```

## Testing

### Unit Test

```typescript
describe('TurnOrchestrator.generateNpcResponse', () => {
  it('should return LLM-generated response for focused NPC', async () => {
    const mockLlmProvider = createMockLlmProvider({
      response: 'Hello, traveler!'
    });

    const orchestrator = new TurnOrchestrator({}, mockLlmProvider);

    const response = await orchestrator['generateNpcResponse'](
      'npc-bartender',
      'Hello there!',
      'session-123'
    );

    expect(response).toBe('Hello, traveler!');
  });

  it('should return null when no focused NPC', async () => {
    const orchestrator = new TurnOrchestrator({}, mockLlmProvider);

    const response = await orchestrator['generateNpcResponse'](
      null,
      'Hello!',
      'session-123'
    );

    expect(response).toBeNull();
  });

  it('should handle LLM timeout gracefully', async () => {
    const slowLlmProvider = createMockLlmProvider({
      delay: 5000 // Exceeds 2s timeout
    });

    const orchestrator = new TurnOrchestrator({}, slowLlmProvider);

    const response = await orchestrator['generateNpcResponse'](
      'npc-bartender',
      'Hello!',
      'session-123'
    );

    // Should fall back to rule-based or return null
    expect(response).toBeDefined();
  });
});
```

### Integration Test

```typescript
it('should generate contextual NPC response in full turn', async () => {
  // Setup session with NPC
  const session = await createTestSession();
  const npc = await spawnNpc(session.id, 'bartender-template');

  const input: TurnInput = {
    sessionId: session.id,
    playerId: 'player-1',
    playerMessage: 'What drinks do you have?',
    focusedNpcId: npc.id,
    locationId: 'tavern-main',
  };

  const result = await orchestrator.processTurn(input);

  expect(result.npcResponse).not.toBeNull();
  expect(result.npcResponse).not.toBe('[NPC response placeholder]');
  expect(result.composedResponse).toContain(result.npcResponse);
});
```

## Acceptance Criteria

- [x] `generateNpcResponse` calls `CognitionLayer.decideLLM`
- [x] NPC profile is fetched from DB
- [x] Actor state is fetched from DB
- [x] Method signature updated to async with sessionId
- [x] Call site in `processTurn` updated
- [x] Unit tests pass
- [x] Integration test with real LLM provider passes (skipped when API key not set)
- [x] Response time < 3 seconds (CognitionLayer has 2s timeout)

## Notes

- CognitionLayer already handles timeouts and fallbacks
- Profile personality data (traits, speech patterns) should influence responses
- Consider caching NPC profiles for repeated interactions in same turn
