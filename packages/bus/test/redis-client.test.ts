import { describe, it, expect, vi, beforeEach } from 'vitest';

const { onMock, RedisCtor } = vi.hoisted(() => {
  const onMock = vi.fn();
  const RedisCtor = vi.fn().mockImplementation(() => ({
    on: onMock,
  }));
  return { onMock, RedisCtor };
});

vi.mock('ioredis', () => ({
  Redis: RedisCtor,
}));

import { redis, pubRedis, subRedis } from '../src/core/redis-client.js';

describe('redis client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates three redis clients and registers error handlers', () => {
    expect(redis).toBeTruthy();
    expect(pubRedis).toBeTruthy();
    expect(subRedis).toBeTruthy();
    expect(RedisCtor).toHaveBeenCalledTimes(3);
    expect(onMock).toHaveBeenCalled();
  });
});
