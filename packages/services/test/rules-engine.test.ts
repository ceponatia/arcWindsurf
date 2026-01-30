import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesEngine } from '../src/rules/rules-engine.js';
import type { WorldEvent } from '@minimal-rpg/schemas';

const { emitMock, subscribeMock, unsubscribeMock } = vi.hoisted(() => ({
  emitMock: vi.fn(),
  subscribeMock: vi.fn(),
  unsubscribeMock: vi.fn(),
}));

let subscribed: ((event: WorldEvent) => Promise<void>) | null = null;

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    emit: emitMock,
    subscribe: vi.fn(async (handler: (event: WorldEvent) => Promise<void>) => {
      subscribed = handler;
    }),
    unsubscribe: unsubscribeMock,
  },
}));

vi.mock('@minimal-rpg/db', () => ({
  getActorState: vi.fn(async () => ({
    actorId: 'player',
    state: { locationId: 'tavern' },
  })),
  getActorsAtLocation: vi.fn(async () => [
    { actorId: 'bartender' },
    { actorId: 'merchant' },
  ]),
  getInventoryItems: vi.fn(async () => [
    { id: 'key' },
    { id: 'torch' },
  ]),
  getSessionGameTime: vi.fn(async () => ({
    year: 1,
    month: 1,
    dayOfMonth: 1,
    absoluteDay: 1,
    hour: 12,
    minute: 0,
    second: 0,
  })),
  getLocationConnections: vi.fn(async () => [
    { targetLocationId: 'street', targetName: 'Street' },
  ]),
  getInventoryItem: vi.fn(async () => null),
}));

describe('RulesEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribed = null;
  });

  it('start/stop are idempotent', () => {
    const engine = new RulesEngine();
    engine.start();
    engine.start();
    engine.stop();
    engine.stop();
  });

  it('validates INTENT events and emits ACTION_REJECTED for invalid', async () => {
    const engine = new RulesEngine();
    engine.start();

    await subscribed?.({
      type: 'MOVE_INTENT',
      actorId: 'player',
      destinationId: 'unreachable',
      sessionId: 'session-1',
      timestamp: new Date(),
    } as unknown as WorldEvent);

    expect(emitMock).toHaveBeenCalled();
    const event = emitMock.mock.calls[0]?.[0] as { type: string; reason: string } | undefined;
    expect(event?.type).toBe('ACTION_REJECTED');
    expect(event?.reason).toContain('Cannot reach');

    engine.stop();
  });

  it('does not emit rejection for valid intents', async () => {
    const engine = new RulesEngine();
    engine.start();

    await subscribed?.({
      type: 'MOVE_INTENT',
      actorId: 'player',
      destinationId: 'street',
      sessionId: 'session-1',
      timestamp: new Date(),
    } as unknown as WorldEvent);

    expect(emitMock).not.toHaveBeenCalled();

    engine.stop();
  });

  it('ignores non-INTENT events', async () => {
    const engine = new RulesEngine();
    engine.start();

    await subscribed?.({
      type: 'TICK',
      tick: 1,
      sessionId: 'session-1',
      timestamp: new Date(),
    } as unknown as WorldEvent);

    expect(emitMock).not.toHaveBeenCalled();

    engine.stop();
  });

  it('handles missing sessionId gracefully', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const engine = new RulesEngine();
    engine.start();

    await subscribed?.({
      type: 'MOVE_INTENT',
      actorId: 'player',
      destinationId: 'street',
      timestamp: new Date(),
    } as unknown as WorldEvent);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing sessionId'));
    expect(emitMock).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    engine.stop();
  });
});
