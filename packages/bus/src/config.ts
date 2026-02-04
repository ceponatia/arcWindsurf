/**
 * Resolve the Redis connection URL for the bus.
 *
 * @returns {string} The Redis connection URL.
 */
export function getRedisUrl(): string {
  return process.env['REDIS_URL'] ?? 'redis://localhost:6379';
}
