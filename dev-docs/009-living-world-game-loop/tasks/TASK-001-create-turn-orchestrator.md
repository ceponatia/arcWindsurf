# TASK-001: Create TurnOrchestrator Service

**Priority**: P0
**Estimate**: 4 hours
**Depends On**: None (foundational)
**Category**: Living World Game Loop

---

## Objective

Create the central `TurnOrchestrator` service that coordinates a single game turn:
player input → intent parsing → event emission → time advancement → response composition.

## Files to Create

- `packages/api/src/services/turn-orchestrator.ts`
- `packages/api/src/services/turn-orchestrator.test.ts`

## Files to Modify

- `packages/api/src/index.ts` (export orchestrator)

## Interface Design

```typescript
import type { WorldEvent, Intent, CharacterProfile } from '@minimal-rpg/schemas';
import type { LLMProvider } from '@minimal-rpg/llm';

/**
 * Configuration for turn handling.
 */
export interface TurnConfig {
  /** Game minutes per turn (default: 5) */
  minutesPerTurn: number;
  /** Whether background NPCs update during turns */
  enableAmbientUpdates: boolean;
  /** How many background events to include per turn (0 = none) */
  maxAmbientNarrations: number;
  /** Narrative verbosity */
  narrativeMode: 'minimal' | 'standard' | 'verbose';
}

/**
 * Input to process a turn.
 */
export interface TurnInput {
  sessionId: string;
  playerId: string;
  playerMessage: string;
  focusedNpcId: string | null;
  locationId: string;
}

/**
 * Result of processing a turn.
 */
export interface TurnResult {
  /** Events emitted during this turn */
  events: WorldEvent[];
  /** The focused NPC's dialogue response */
  npcResponse: string | null;
  /** Ambient narration to include */
  ambientNarration: string[];
  /** Location transition narration (if player moved) */
  transitionNarration: string | null;
  /** Final composed response for display */
  composedResponse: string;
  /** New location (if player moved) */
  newLocationId: string | null;
  /** Game time after this turn */
  gameTime: { hour: number; minute: number };
}

/**
 * TurnOrchestrator coordinates the processing of a single game turn.
 */
export class TurnOrchestrator {
  constructor(
    private config: TurnConfig,
    private llmProvider: LLMProvider
  ) {}

  /**
   * Process a complete turn.
   */
  async processTurn(input: TurnInput): Promise<TurnResult>;
}
```

## Implementation Steps

### 1. Create Basic Class Structure

```typescript
export class TurnOrchestrator {
  private config: TurnConfig;
  private llmProvider: LLMProvider;

  constructor(config: Partial<TurnConfig>, llmProvider: LLMProvider) {
    this.config = {
      minutesPerTurn: config.minutesPerTurn ?? 5,
      enableAmbientUpdates: config.enableAmbientUpdates ?? true,
      maxAmbientNarrations: config.maxAmbientNarrations ?? 3,
      narrativeMode: config.narrativeMode ?? 'standard',
    };
    this.llmProvider = llmProvider;
  }

  async processTurn(input: TurnInput): Promise<TurnResult> {
    const events: WorldEvent[] = [];

    // Step 1: Parse player intent (TASK-011 dependency)
    // Step 2: Emit intents to WorldBus
    // Step 3: Advance time
    // Step 4: Collect ambient events (TASK-014 dependency)
    // Step 5: Generate focused NPC response
    // Step 6: Compose final response (TASK-016 dependency)

    // Placeholder implementation
    return {
      events,
      npcResponse: null,
      ambientNarration: [],
      transitionNarration: null,
      composedResponse: '',
      newLocationId: null,
      gameTime: { hour: 12, minute: 0 },
    };
  }
}
```

### 2. Integrate with WorldBus

```typescript
import { worldBus } from '@minimal-rpg/bus';

private async emitIntents(intents: Intent[], sessionId: string): Promise<WorldEvent[]> {
  const emittedEvents: WorldEvent[] = [];

  for (const intent of intents) {
    const event: WorldEvent = {
      ...intent,
      sessionId,
      timestamp: new Date(),
    };
    await worldBus.emit(event);
    emittedEvents.push(event);
  }

  return emittedEvents;
}
```

### 3. Integrate with TimeService

```typescript
import { timeService } from '@minimal-rpg/services';

private async advanceTime(sessionId: string, minutes: number): Promise<void> {
  await timeService.advance(sessionId, minutes);

  // Emit TICK event
  await worldBus.emit({
    type: 'TICK',
    sessionId,
    timestamp: new Date(),
    tick: Date.now(), // Or use game tick counter
  });
}
```

### 4. Generate NPC Response (Placeholder for TASK-011)

```typescript
private async generateNpcResponse(
  focusedNpcId: string,
  playerMessage: string,
  context: ConversationContext
): Promise<string | null> {
  if (!focusedNpcId) return null;

  // TODO: Wire to actor cognition or direct LLM call
  // For now, placeholder
  return '[NPC response placeholder]';
}
```

### 5. Compose Final Response

```typescript
private composeResponse(
  npcResponse: string | null,
  ambientNarration: string[],
  transitionNarration: string | null
): string {
  const parts: string[] = [];

  // Transition first
  if (transitionNarration) {
    parts.push(`*${transitionNarration}*`);
  }

  // Ambient narration
  for (const narration of ambientNarration) {
    parts.push(`*${narration}*`);
  }

  // NPC dialogue last
  if (npcResponse) {
    parts.push(npcResponse);
  }

  return parts.join('\n\n');
}
```

## Acceptance Criteria

- [ ] `TurnOrchestrator` class created with constructor accepting config and LLM provider
- [ ] `processTurn()` method implemented with placeholder steps
- [ ] Integration points documented for TASK-011 (intent parsing), TASK-014 (ambient), TASK-016 (composition)
- [ ] Events emitted to WorldBus during turn processing
- [ ] Time advancement integrated with TimeService
- [ ] Response composition handles all three parts (transition, ambient, dialogue)
- [ ] Unit tests cover basic flow with mocked dependencies
- [ ] Exported from `@minimal-rpg/api`

## Testing

```typescript
import { TurnOrchestrator, type TurnConfig } from './turn-orchestrator.js';
import { createMockLLMProvider } from '@minimal-rpg/llm/test-utils';

describe('TurnOrchestrator', () => {
  const mockLLM = createMockLLMProvider();
  const config: TurnConfig = {
    minutesPerTurn: 5,
    enableAmbientUpdates: false, // Disable for unit tests
    maxAmbientNarrations: 0,
    narrativeMode: 'minimal',
  };

  it('should process a turn and return a result', async () => {
    const orchestrator = new TurnOrchestrator(config, mockLLM);

    const result = await orchestrator.processTurn({
      sessionId: 'test-session',
      playerId: 'player-1',
      playerMessage: 'Hello!',
      focusedNpcId: 'npc-1',
      locationId: 'loc-1',
    });

    expect(result).toBeDefined();
    expect(result.composedResponse).toBeDefined();
  });

  it('should emit events to WorldBus', async () => {
    // Test event emission
  });

  it('should advance time by configured minutes', async () => {
    // Test time advancement
  });
});
```

## Notes

- This is the foundational service - other tasks build on it
- Keep the initial implementation simple with placeholders for dependent tasks
- Consider making config per-session, not global
