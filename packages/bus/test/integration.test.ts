import { describe, it, expect, beforeEach, vi } from 'vitest';

const { subscribers, publishMock, subscribeMock, unsubscribeMock } = vi.hoisted(() => {
  const subscribers = new Set<(event: import('@minimal-rpg/schemas').WorldEvent) => void | Promise<void>>();
  const publishMock = vi.fn(async (event: import('@minimal-rpg/schemas').WorldEvent) => {
    for (const handler of subscribers) {
      await handler(event);
    }
  });
  const subscribeMock = vi.fn(async (handler: (event: import('@minimal-rpg/schemas').WorldEvent) => void | Promise<void>) => {
    subscribers.add(handler);
  });
  const unsubscribeMock = vi.fn((handler: (event: import('@minimal-rpg/schemas').WorldEvent) => void | Promise<void>) => {
    subscribers.delete(handler);
  });
  return { subscribers, publishMock, subscribeMock, unsubscribeMock };
});

vi.mock('../src/adapters/redis-pubsub.js', () => ({
  redisPubSub: {
    publish: publishMock,
    subscribe: subscribeMock,
    unsubscribe: unsubscribeMock,
  },
}));

import {
  WorldBus,
  telemetryMiddleware,
  persistenceMiddleware,
  registerPersistenceHandler,
} from '../src/index.js';
import type { WorldEvent } from '@minimal-rpg/schemas';

describe('Phase 1 & 2 Integration', () => {
  const capturedEvents: WorldEvent[] = [];

  beforeEach(() => {
    capturedEvents.length = 0;
    subscribers.clear();
    publishMock.mockClear();
    subscribeMock.mockClear();
    unsubscribeMock.mockClear();
  });

  function createBus(): WorldBus {
    const bus = new WorldBus();
    bus.use(telemetryMiddleware);
    bus.use(persistenceMiddleware);
    return bus;
  }

  it('should emit and persist TICK events', async () => {
    registerPersistenceHandler(async (event: WorldEvent) => {
      capturedEvents.push(event);
    });
    const bus = createBus();

    const tickEvent: WorldEvent = {
      type: 'TICK',
      tick: 1,
      timestamp: new Date(),
    };

    await bus.emit(tickEvent);

    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0]?.type).toBe('TICK');
  });

  it('should emit and persist MOVE_INTENT events', async () => {
    registerPersistenceHandler(async (event: WorldEvent) => {
      capturedEvents.push(event);
    });
    const bus = createBus();

    const moveIntent: WorldEvent = {
      type: 'MOVE_INTENT',
      destinationId: 'tavern',
    };

    await bus.emit(moveIntent);

    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0]?.type).toBe('MOVE_INTENT');
  });

  it('should subscribe to events via WorldBus', async () => {
    const receivedEvents: WorldEvent[] = [];
    const bus = createBus();

    const handler = (event: WorldEvent) => {
      receivedEvents.push(event);
    };

    await bus.subscribe(handler);

    const speakIntent: WorldEvent = {
      type: 'SPEAK_INTENT',
      content: 'Hello, world!',
    };

    await bus.emit(speakIntent);

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]?.type).toBe('SPEAK_INTENT');

    bus.unsubscribe(handler);
  });
});
