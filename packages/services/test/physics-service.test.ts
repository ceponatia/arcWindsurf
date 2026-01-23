import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhysicsService } from '../src/physics/physics-engine.js';
import type { WorldEvent } from '@minimal-rpg/schemas';

const emitMock = vi.fn();
let subscribed: ((event: WorldEvent) => Promise<void>) | null = null;

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    emit: emitMock,
    subscribe: vi.fn(async (handler: (event: WorldEvent) => Promise<void>) => {
      subscribed = handler;
    }),
    unsubscribe: vi.fn(),
  },
}));

describe('PhysicsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribed = null;
  });

  it('emits MOVED effects for MOVE_INTENT', async () => {
    const service = new PhysicsService();
    service.start();

    await subscribed?.({
      type: 'MOVE_INTENT',
      destinationId: 'loc-2',
      actorId: 'npc-1',
      fromLocationId: 'loc-1',
      sessionId: 'session-1',
    } as unknown as WorldEvent);

    expect(emitMock).toHaveBeenCalled();
    const event = emitMock.mock.calls[0]?.[0] as { type: string; toLocationId?: string } | undefined;
    expect(event?.type).toBe('MOVED');
    expect(event?.toLocationId).toBe('loc-2');
  });

  it('start/stop are idempotent', () => {
    const service = new PhysicsService();
    service.start();
    service.start();
    service.stop();
    service.stop();
  });
});
