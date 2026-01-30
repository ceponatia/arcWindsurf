import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import { worldBus } from '@minimal-rpg/bus';
import { timeService } from '@minimal-rpg/services';
import * as dbNode from '@minimal-rpg/db/node';
import type { LLMProvider, LLMStreamChunk, LLMResponse, LLMMessage } from '@minimal-rpg/llm';
import { TurnOrchestrator, type TurnConfig } from '../../src/services/turn-orchestrator.js';

/**
 * Build a minimal mock LLM provider for unit tests.
 */
function createMockLLMProvider(): LLMProvider {
  return {
    id: 'mock-llm',
    supportsTools: false,
    supportsFunctions: false,
    chat: (messages: LLMMessage[]): Effect.Effect<LLMResponse, Error> => {
      void messages;
      return Effect.succeed({ id: 'mock-response', content: null });
    },
    stream: (messages: LLMMessage[]): Effect.Effect<AsyncIterable<LLMStreamChunk>, Error> => {
      void messages;
      return Effect.succeed(emptyStream());
    },
  };
}

/**
 * Return an empty async iterable for streaming responses.
 */
async function* emptyStream(): AsyncIterable<LLMStreamChunk> {
  const chunks: LLMStreamChunk[] = [];
  await Promise.resolve();
  if (chunks.length > 0) {
    yield chunks[0]!;
  }
}

describe('services/turn-orchestrator', () => {
  const config: TurnConfig = {
    minutesPerTurn: 5,
    enableAmbientUpdates: false,
    maxAmbientNarrations: 0,
    narrativeMode: 'minimal',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    // Mock DB calls to avoid connection errors in unit tests
    vi.spyOn(dbNode, 'getActorState').mockResolvedValue(undefined);
    vi.spyOn(dbNode, 'getEntityProfile').mockResolvedValue(undefined);
  });

  it('should process a turn and return a result', async () => {
    const orchestrator = new TurnOrchestrator(config, createMockLLMProvider());

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
    const emitSpy = vi.spyOn(worldBus, 'emit').mockResolvedValue();
    const orchestrator = new TurnOrchestrator(config, createMockLLMProvider());

    await orchestrator.processTurn({
      sessionId: 'test-session',
      playerId: 'player-1',
      playerMessage: 'Hello!',
      focusedNpcId: null,
      locationId: 'loc-1',
    });

    expect(emitSpy).toHaveBeenCalled();
  });

  it('should advance time by configured minutes', async () => {
    const tickSpy = vi.spyOn(timeService, 'emitTick').mockResolvedValue();
    const orchestrator = new TurnOrchestrator(config, createMockLLMProvider());

    await orchestrator.processTurn({
      sessionId: 'test-session',
      playerId: 'player-1',
      playerMessage: 'Wait.',
      focusedNpcId: null,
      locationId: 'loc-1',
    });

    expect(tickSpy).toHaveBeenCalledTimes(1);
  });
});
