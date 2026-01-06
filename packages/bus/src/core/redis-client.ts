import { Redis } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const pubRedis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const subRedis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err: Error) => console.error('Redis Client Error', err));
pubRedis.on('error', (err: Error) => console.error('Redis Pub Client Error', err));
subRedis.on('error', (err: Error) => console.error('Redis Sub Client Error', err));
