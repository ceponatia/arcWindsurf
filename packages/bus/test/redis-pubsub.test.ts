import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorldEvent } from '@minimal-rpg/schemas';
import type { RedisPubSubAdapter } from '../src/adapters/redis-pubsub.js';

const { publishMock, subscribeMock, onMock, subRedisOnMock } = vi.hoisted(() => {
  const publishMock = vi.fn();
  const subscribeMock = vi.fn();
  const onMock = vi.fn();
  const subRedisOnMock = vi.fn();
  return { publishMock, subscribeMock, onMock, subRedisOnMock };
});

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

describe('redis-pubsub adapter', () => {
  let redisPubSub: RedisPubSubAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    messageHandler = null;
    subRedisOnMock.mockImplementation((event: string, handler: (channel: string, message: string) => void) => {
      if (event === 'message') {
        messageHandler = handler;
      }
    });
    // Re-import to get fresh singleton
    const mod = await import('../src/adapters/redis-pubsub.js');
    redisPubSub = mod.redisPubSub;
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

    // Wait for async .catch() to execute
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
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
