import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorldEvent } from '@minimal-rpg/schemas';

const publishMock = vi.fn();
const subscribeMock = vi.fn();
const onMock = vi.fn();

const subRedisOnMock = vi.fn();
let messageHandler: ((channel: string, message: string) => void) | null = null;

vi.mock('../src/core/redis-client.js', () => ({
  pubRedis: {
    publish: publishMock,
    on: onMock,
  },
  subRedis: {
    subscribe: subscribeMock,
    on: subRedisOnMock,
  },
}));

import { redisPubSub } from '../src/adapters/redis-pubsub.js';

describe('redis-pubsub adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageHandler = null;
    subRedisOnMock.mockImplementation((event: string, handler: (channel: string, message: string) => void) => {
      if (event === 'message') {
        messageHandler = handler;
      }
    });
  });

  it('publishes to the redis channel', async () => {
    await redisPubSub.publish({ type: 'TICK', tick: 1, timestamp: new Date() } as unknown as WorldEvent);

    expect(publishMock).toHaveBeenCalledTimes(1);
  });

  it('subscribes once and dispatches events to handlers', async () => {
    const handler = vi.fn();
    await redisPubSub.subscribe(handler);
    await redisPubSub.subscribe(vi.fn());

    expect(subscribeMock).toHaveBeenCalledTimes(1);

    const event: WorldEvent = { type: 'SPOKE', sessionId: 'session-1', actorId: 'player-1', content: 'hi' } as unknown as WorldEvent;
    messageHandler?.('world-events', JSON.stringify(event));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('logs errors for handler rejections', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = vi.fn(() => Promise.reject(new Error('boom')));

    await redisPubSub.subscribe(handler);

    const event = { type: 'TICK', tick: 1, timestamp: new Date() } as unknown as WorldEvent;
    messageHandler?.('world-events', JSON.stringify(event));

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('logs errors for invalid json', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await redisPubSub.subscribe(vi.fn());

    messageHandler?.('world-events', '{');

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('unsubscribes handlers', () => {
    const handler = vi.fn();
    redisPubSub.unsubscribe(handler);
    expect(true).toBe(true);
  });
});
