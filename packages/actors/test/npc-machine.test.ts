import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import { createActor } from 'xstate';
import type { CharacterProfile, WorldEvent } from '@minimal-rpg/schemas';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import { createNpcMachine } from '../src/npc/npc-machine.js';
import type { NpcMachineContext } from '../src/npc/types.js';
import { CognitionLayer } from '../src/npc/cognition.js';
import { worldBus } from '@minimal-rpg/bus';

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    emit: vi.fn(async () => undefined),
    subscribe: vi.fn(async () => undefined),
    unsubscribe: vi.fn(() => undefined),
  },
}));

describe('npc/npc-machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('buffers events and emits intents', async () => {
    const context: NpcMachineContext = {
      actorId: 'npc-1',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      recentEvents: [],
    };

    const machine = createNpcMachine(context);
    const actor = createActor(machine).start();

    const event: WorldEvent = {
      type: 'SPOKE',
      actorId: 'player-1',
      sessionId: 'session-1',
    } as unknown as WorldEvent;

    actor.send({ type: 'WORLD_EVENT', event });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(vi.mocked(worldBus.emit)).toHaveBeenCalled();
  });

  it('ignores non-meaningful events', () => {
    const context: NpcMachineContext = {
      actorId: 'npc-1',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      recentEvents: [],
    };

    const machine = createNpcMachine(context);
    const actor = createActor(machine).start();

    actor.send({
      type: 'WORLD_EVENT',
      event: { type: 'TICK', tick: 1, timestamp: new Date() } as unknown as WorldEvent,
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('idle');
    expect(snapshot.context.recentEvents).toHaveLength(0);
  });

  it('clears buffered events after cooldown', async () => {
    vi.useFakeTimers();

    const context: NpcMachineContext = {
      actorId: 'npc-1',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      recentEvents: [],
    };

    const machine = createNpcMachine(context);
    const actor = createActor(machine).start();

    actor.send({ type: 'WORLD_EVENT', event: { type: 'TICK' } as unknown as WorldEvent });

    await vi.advanceTimersByTimeAsync(600);

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.recentEvents).toHaveLength(0);
    vi.useRealTimers();
  });

  it('enriches intent events with session and actor ids', async () => {
    const llmProvider: LLMProvider = {
      id: 'mock',
      supportsTools: false,
      supportsFunctions: false,
      chat: () =>
        Effect.succeed({
          id: 'resp',
          content: 'Hello there',
        } as LLMResponse),
      stream: () =>
        Effect.succeed(
          (async function* empty(): AsyncGenerator<LLMStreamChunk> {
            // not used
          })()
        ),
    };

    const context: NpcMachineContext = {
      actorId: 'npc-1',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      recentEvents: [],
      llmProvider,
      profile: { name: 'NPC' } as CharacterProfile,
    };

    const machine = createNpcMachine(context);
    const actor = createActor(machine).start();

    const event: WorldEvent = {
      type: 'SPOKE',
      actorId: 'player-1',
      sessionId: 'session-1',
      content: 'Hi',
    } as unknown as WorldEvent;

    actor.send({ type: 'WORLD_EVENT', event });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const calls = vi.mocked(worldBus.emit).mock.calls;
    expect(calls).toHaveLength(1);

    const emitted = calls[0]?.[0] as WorldEvent;
    expect(emitted.type).toBe('SPEAK_INTENT');
    expect((emitted as Record<string, unknown>).sessionId).toBe('session-1');
    expect((emitted as Record<string, unknown>).actorId).toBe('npc-1');
    expect((emitted as Record<string, unknown>).timestamp).toBeInstanceOf(Date);
  });

  it('ignores MOVED events as non-meaningful', () => {
    const context: NpcMachineContext = {
      actorId: 'npc-1',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      recentEvents: [],
    };

    const machine = createNpcMachine(context);
    const actor = createActor(machine).start();

    actor.send({
      type: 'WORLD_EVENT',
      event: { type: 'MOVED', actorId: 'player-1', toLocationId: 'loc-1' } as unknown as WorldEvent,
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('idle');
    expect(snapshot.context.recentEvents).toHaveLength(0);
  });

  it('skips emitting intents when LLM decision fails', async () => {
    const llmProvider: LLMProvider = {
      id: 'mock',
      supportsTools: false,
      supportsFunctions: false,
      chat: () =>
        Effect.succeed({
          id: 'resp',
          content: 'Hello there',
        } as LLMResponse),
      stream: () =>
        Effect.succeed(
          (async function* empty(): AsyncGenerator<LLMStreamChunk> {
            // not used
          })()
        ),
    };

    const context: NpcMachineContext = {
      actorId: 'npc-1',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      recentEvents: [],
      llmProvider,
      profile: { name: 'NPC' } as CharacterProfile,
    };

    const spy = vi.spyOn(CognitionLayer, 'decideLLM').mockRejectedValue(new Error('boom'));

    const machine = createNpcMachine(context);
    const actor = createActor(machine).start();

    const event: WorldEvent = {
      type: 'SPOKE',
      actorId: 'player-1',
      sessionId: 'session-1',
      content: 'Hi',
    } as unknown as WorldEvent;

    actor.send({ type: 'WORLD_EVENT', event });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(vi.mocked(worldBus.emit)).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
