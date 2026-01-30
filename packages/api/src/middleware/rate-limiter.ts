import type { Context, Next } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (c: Context) => string;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  windowMs: 60_000,
  maxRequests: 120,
};

/**
 * Simple in-memory rate limiter middleware.
 * For production with multiple API instances, use Redis-backed rate limiting.
 */
export function createRateLimiter(options?: Partial<RateLimiterOptions>) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const store = new Map<string, RateLimitEntry>();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, config.windowMs);

  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  return async (c: Context, next: Next): Promise<Response | void> => {
    const key = config.keyGenerator?.(c) ?? getDefaultKey(c);
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + config.windowMs };
      store.set(key, entry);
    }

    entry.count++;

    c.header('X-RateLimit-Limit', String(config.maxRequests));
    c.header('X-RateLimit-Remaining', String(Math.max(0, config.maxRequests - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > config.maxRequests) {
      return c.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        },
        429
      );
    }

    await next();
  };
}

function getDefaultKey(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limiter for heartbeat endpoints.
 * Allows 2 requests per second per session (generous for reconnects).
 */
export const heartbeatRateLimiter = createRateLimiter({
  windowMs: 1000,
  maxRequests: 2,
  keyGenerator: (c) => {
    const sessionId = c.req.param('id') ?? 'unknown';
    const forwarded = c.req.header('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown';
    return `heartbeat:${sessionId}:${ip}`;
  },
});

/**
 * Rate limiter for turn processing (LLM inference).
 * Strict limit: 1 request per minute per session.
 * Acts as a fallback cost control if other systems fail.
 */
export const turnRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 1,
  keyGenerator: (c) => {
    const sessionId = c.req.param('id') ?? 'unknown';
    return `turn:${sessionId}`;
  },
});

/**
 * Rate limiter for login attempts.
 * Security-critical: prevents brute-force/credential stuffing.
 * 5 attempts per minute per IP.
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  keyGenerator: (c) => {
    const forwarded = c.req.header('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown';
    return `login:${ip}`;
  },
});

/**
 * Rate limiter for studio LLM endpoints.
 * 10 requests per minute per IP (for unauthenticated) or user.
 */
export const studioRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  keyGenerator: (c) => {
    const forwarded = c.req.header('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown';
    return `studio:${ip}`;
  },
});
