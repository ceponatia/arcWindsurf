import { describe, it, expect, vi } from 'vitest';
import { Effect } from 'effect';
import { createCognitionProcessor } from '../src/processors/cognition.js';
import { createTickProcessor } from '../src/processors/tick.js';
import { createEmbeddingProcessor } from '../src/processors/embedding.js';
import type { WorldBus } from '@minimal-rpg/bus';
import type { TieredCognitionRouter } from '@minimal-rpg/llm';


describe('processors', () => {
  it('emits tick events', async () => {
    const bus = { emit: vi.fn(async () => undefined) } as unknown as WorldBus;
    const processor = createTickProcessor(bus);
    const result = await processor({
      data: { sessionId: 's1', payload: { tickCount: 1, timestamp: Date.now() } },
    } as never);

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalled();
  });

  it('runs cognition and emits speak intent', async () => {
    const bus = { emit: vi.fn(async () => undefined) } as unknown as WorldBus;
    const router = {
      execute: vi.fn(() => Effect.succeed({ content: 'Hi' })),
    } as unknown as TieredCognitionRouter;
    const processor = createCognitionProcessor(bus, router);
    const result = await processor({
      data: {
        sessionId: 's1',
        payload: { actorId: 'npc-1', context: { lastEvents: [], availableTools: [] } },
      },
    } as never);

    expect(result.success).toBe(true);
    expect(bus.emit).toHaveBeenCalled();
  });

  it('handles empty LLM response', async () => {
    const bus = { emit: vi.fn(async () => undefined) } as unknown as WorldBus;
    const router = {
      execute: vi.fn(() => Effect.succeed({ content: '' })),
    } as unknown as TieredCognitionRouter;
    const processor = createCognitionProcessor(bus, router);
    const result = await processor({
      data: {
        sessionId: 's1',
        payload: { actorId: 'npc-1', context: { lastEvents: [], availableTools: [] } },
      },
    } as never);

    expect(result.success).toBe(false);
  });

  it('runs embedding processor', async () => {
    vi.useFakeTimers();
    const processor = createEmbeddingProcessor();
    const promise = processor({
      data: { sessionId: 's1', payload: { nodeId: 'n1', text: 'hello' } },
    } as never);

    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.success).toBe(true);
    vi.useRealTimers();
  });
});
