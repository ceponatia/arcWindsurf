export interface SessionCacheConfig {
  redisUrl: string;
}

/**
 * Resolve cache configuration from environment variables.
 */
export function getSessionCacheConfig(): SessionCacheConfig {
  return {
    redisUrl: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  };
}
