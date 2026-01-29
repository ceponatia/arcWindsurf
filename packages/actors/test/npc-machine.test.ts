import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import type { WorldEvent } from '@minimal-rpg/schemas';
import { createNpcMachine } from '../src/npc/npc-machine.js';
import type { NpcMachineContext } from '../src/npc/types.js';
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
});
