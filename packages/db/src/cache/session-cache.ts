import { Redis } from 'ioredis';
import { getSessionCacheConfig } from './config.js';

const { redisUrl } = getSessionCacheConfig();

export const sessionCache = new Redis(redisUrl, {
  keyPrefix: 'session:',
});

/**
 * Fetch a cached session payload by id.
 */
export async function getCachedSession<T>(sessionId: string): Promise<T | null> {
  const data = await sessionCache.get(sessionId);
  if (!data) return null;
  return JSON.parse(data) as T;
}

/**
 * Store a session payload in cache with a TTL.
 */
export async function setCachedSession<T>(sessionId: string, data: T, ttlSeconds = 3600): Promise<void> {
  await sessionCache.set(sessionId, JSON.stringify(data), 'EX', ttlSeconds);
}

/**
 * Remove a cached session payload.
 */
export async function invalidateSessionCache(sessionId: string): Promise<void> {
  await sessionCache.del(sessionId);
}
