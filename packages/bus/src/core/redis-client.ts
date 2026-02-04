import { Redis } from 'ioredis';
import { getRedisUrl } from '../config.js';

const REDIS_URL = getRedisUrl();

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
