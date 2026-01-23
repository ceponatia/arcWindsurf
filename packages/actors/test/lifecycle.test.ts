import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorldEvent } from '@minimal-rpg/schemas';
import { worldBus } from '@minimal-rpg/bus';
import { BaseActorLifecycle } from '../src/base/lifecycle.js';
import type { Actor } from '../src/base/types.js';

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    emit: vi.fn(async () => undefined),
    subscribe: vi.fn(async () => undefined),
    unsubscribe: vi.fn(() => undefined),
  },
}));

describe('base/lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes and forwards events to actor', async () => {
    const sendMock = vi.fn();
    const actor: Actor = {
      id: 'actor-1',
      type: 'npc',
      sessionId: 'session-1',
      start: () => undefined,
      stop: () => undefined,
      send: sendMock,
      getSnapshot: () => ({
        id: 'actor-1',
        type: 'npc',
        sessionId: 'session-1',
        locationId: 'loc-1',
        spawnedAt: new Date('2026-01-22T00:00:00.000Z'),
        lastActiveAt: new Date('2026-01-22T00:00:00.000Z'),
      }),
    };

    const lifecycle = new BaseActorLifecycle(actor);

    const subscribeMock = vi.mocked(worldBus.subscribe);
    subscribeMock.mockImplementationOnce(async (handler: (event: WorldEvent) => void) => {
      handler({ type: 'TICK' } as WorldEvent);
    });

    await lifecycle.start();

    expect(sendMock).toHaveBeenCalled();
    expect(lifecycle.isStarted()).toBe(true);
  });

  it('stops and unsubscribes', async () => {
    const actor: Actor = {
      id: 'actor-1',
      type: 'npc',
      sessionId: 'session-1',
      start: () => undefined,
      stop: () => undefined,
      send: () => undefined,
      getSnapshot: () => ({
        id: 'actor-1',
        type: 'npc',
        sessionId: 'session-1',
        locationId: 'loc-1',
        spawnedAt: new Date('2026-01-22T00:00:00.000Z'),
        lastActiveAt: new Date('2026-01-22T00:00:00.000Z'),
      }),
    };

    const lifecycle = new BaseActorLifecycle(actor);

    const subscribeMock = vi.mocked(worldBus.subscribe);
    subscribeMock.mockImplementationOnce(async () => undefined);

    await lifecycle.start();
    lifecycle.stop();

    expect(vi.mocked(worldBus.unsubscribe)).toHaveBeenCalled();
    expect(lifecycle.isStarted()).toBe(false);
  });

  it('does nothing when stopping before start', () => {
    const actor: Actor = {
      id: 'actor-1',
      type: 'npc',
      sessionId: 'session-1',
      start: () => undefined,
      stop: () => undefined,
      send: () => undefined,
      getSnapshot: () => ({
        id: 'actor-1',
        type: 'npc',
        sessionId: 'session-1',
        locationId: 'loc-1',
        spawnedAt: new Date('2026-01-22T00:00:00.000Z'),
        lastActiveAt: new Date('2026-01-22T00:00:00.000Z'),
      }),
    };

    const lifecycle = new BaseActorLifecycle(actor);
    lifecycle.stop();

    expect(lifecycle.isStarted()).toBe(false);
  });
});
