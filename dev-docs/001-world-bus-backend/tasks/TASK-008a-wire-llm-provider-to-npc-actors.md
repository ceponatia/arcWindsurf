# TASK-008a: Wire LLM Provider to NPC Actors

**Priority**: P2
**Estimate**: 1-2 hours
**Depends On**: TASK-008
**Category**: World Bus Phase 4 - Actor Intelligence

---

## Objective

Complete the end-to-end wiring of LLM provider injection into NPC actors, enabling the `decideLLM()` cognition method to actually receive a provider instance.

## Background

TASK-008 added `llmProvider?: LLMProvider` and `profile?: CharacterProfile` to `NpcMachineContext` in types.ts, but these are never populated because:

1. `NpcActor` constructor doesn't accept these parameters
2. `ActorRegistry.spawn()` doesn't forward them

## Files to Modify

- `packages/actors/src/base/types.ts`
- `packages/actors/src/npc/npc-actor.ts`
- `packages/actors/src/registry/actor-registry.ts`
- `packages/actors/src/npc/cognition.ts` (timing instrumentation)

## Implementation Steps

### 1. Extend ActorConfig for NPCs

In `packages/actors/src/base/types.ts`:

```typescript
import type { LLMProvider } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';

export interface NpcActorConfig extends ActorConfig {
  npcId: string;
  profile?: CharacterProfile;
  llmProvider?: LLMProvider;
}
```

### 2. Update NpcActor Constructor

In `packages/actors/src/npc/npc-actor.ts`:

```typescript
import type { NpcActorConfig } from '../base/types.js';

export class NpcActor implements Actor {
  // ...existing fields...
  private readonly profile?: CharacterProfile;
  private readonly llmProvider?: LLMProvider;

  constructor(config: NpcActorConfig) {
    this.id = config.id;
    this.sessionId = config.sessionId;
    this.npcId = config.npcId;
    this.locationId = config.locationId;
    this.profile = config.profile;
    this.llmProvider = config.llmProvider;

    const context: NpcMachineContext = {
      actorId: this.id,
      npcId: this.npcId,
      sessionId: this.sessionId,
      locationId: this.locationId,
      recentEvents: [],
      profile: config.profile,        // NEW
      llmProvider: config.llmProvider, // NEW
    };

    // ...rest unchanged...
  }
}
```

### 3. Update ActorRegistry.spawn()

In `packages/actors/src/registry/actor-registry.ts`:

```typescript
import type { NpcActorConfig } from '../base/types.js';

spawn(config: ActorConfig & Partial<Pick<NpcActorConfig, 'npcId' | 'profile' | 'llmProvider'>>): Actor {
  // ...existing validation...

  if (config.type === 'npc') {
    if (!config.npcId) {
      throw new Error('npcId required for NPC actors');
    }
    actor = new NpcActor({
      ...config,
      npcId: config.npcId,
      profile: config.profile,
      llmProvider: config.llmProvider,
    });
  }
  // ...rest unchanged...
}
```

### 4. Add Timing Instrumentation

In `packages/actors/src/npc/cognition.ts`, wrap `decideLLM()`:

```typescript
static async decideLLM(
  context: CognitionContext,
  profile: CharacterProfile,
  llmProvider: LLMProvider
): Promise<ActionResult | null> {
  const start = performance.now();

  try {
    // ...existing LLM call...
    const result = await Effect.runPromise(llmProvider.chat(messages));

    const elapsed = performance.now() - start;
    if (elapsed > 2000) {
      console.warn(`[NPC Cognition] Decision took ${elapsed.toFixed(0)}ms (>2s threshold)`);
    }

    return parseDecision(result.content);
  } catch (error) {
    console.error('[NPC Cognition] LLM failed, falling back to rules', error);
    return this.decideSync(context);
  }
}
```

## Acceptance Criteria

- [x] `NpcActorConfig` interface exists in `base/types.ts`
- [x] `NpcActor` accepts and forwards `profile` and `llmProvider` to context
- [x] `ActorRegistry.spawn()` accepts and forwards these parameters
- [x] Timing instrumentation logs warning if decision times out (>2s cap)
- [x] Existing tests still pass
- [x] Integration test: spawn NPC with mock LLM provider, verify provider reaches cognition

## Testing

```typescript
// Test: LLM provider reaches cognition layer
it('should pass LLM provider to cognition', async () => {
  const mockProvider = createMockLLMProvider();
  const actor = actorRegistry.spawn({
    id: 'test-npc',
    type: 'npc',
    sessionId: 'session-1',
    locationId: 'loc-1',
    npcId: 'npc-1',
    llmProvider: mockProvider,
    profile: testProfile,
  });

  // Trigger cognition and verify mock was called
  actor.send({ type: 'SPOKE', content: 'Hello', ... });
  await waitFor(() => expect(mockProvider.chat).toHaveBeenCalled());
});
```

## Notes

- This unblocks full validation of TASK-008
- Consider adding a default provider singleton as fallback
