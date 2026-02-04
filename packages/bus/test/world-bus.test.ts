import { describe, it, expect, vi, beforeEach } from 'vitest';

const { publishMock, subscribeMock, unsubscribeMock } = vi.hoisted(() => {
  const publishMock = vi.fn();
  const subscribeMock = vi.fn();
  const unsubscribeMock = vi.fn();
  return { publishMock, subscribeMock, unsubscribeMock };
});

vi.mock('../src/adapters/redis-pubsub.js', () => ({
  redisPubSub: {
    publish: publishMock,
    subscribe: subscribeMock,
    unsubscribe: unsubscribeMock,
  },
}));

import type { WorldEvent } from '@minimal-rpg/schemas';
import { WorldBus } from '../src/index.js';

describe('WorldBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs middleware in order and publishes', async () => {
    const bus = new WorldBus();
    const calls: string[] = [];

    bus.use(async (_event, next) => {
      calls.push('first');
      await next();
    });

    bus.use(async (_event, next) => {
      calls.push('second');
      await next();
    });

    await bus.emit({ type: 'TICK', tick: 1, timestamp: new Date() } as unknown as WorldEvent);

    expect(calls).toEqual(['first', 'second']);
    expect(publishMock).toHaveBeenCalledTimes(1);
  });

  it('subscribes and unsubscribes handlers', async () => {
    const bus = new WorldBus();
    const handler = vi.fn();

    await bus.subscribe(handler);
    bus.unsubscribe(handler);

    expect(subscribeMock).toHaveBeenCalledWith(handler);
    expect(unsubscribeMock).toHaveBeenCalledWith(handler);
  });
});
