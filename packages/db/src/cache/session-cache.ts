import { Redis } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

export const sessionCache = new Redis(REDIS_URL, {
  keyPrefix: 'session:',
});

export async function getCachedSession<T>(sessionId: string): Promise<T | null> {
  const data = await sessionCache.get(sessionId);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function setCachedSession<T>(sessionId: string, data: T, ttlSeconds = 3600): Promise<void> {
  await sessionCache.set(sessionId, JSON.stringify(data), 'EX', ttlSeconds);
}

export async function invalidateSessionCache(sessionId: string): Promise<void> {
  await sessionCache.del(sessionId);
}
