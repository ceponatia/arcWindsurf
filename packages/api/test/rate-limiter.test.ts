import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createRateLimiter } from '../src/middleware/rate-limiter.js';

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows requests within the limit', async () => {
    const app = new Hono();
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 3 });

    app.use('*', limiter);
    app.get('/test', (c) => c.json({ ok: true }));

    const responses = await Promise.all([
      app.request('/test'),
      app.request('/test'),
      app.request('/test'),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(200);
    }
  });

  it('blocks requests over the limit', async () => {
    const app = new Hono();
    const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 2 });

    app.use('*', limiter);
    app.get('/test', (c) => c.json({ ok: true }));

    const res1 = await app.request('/test');
    const res2 = await app.request('/test');
    const res3 = await app.request('/test');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(429);

    const body = (await res3.json()) as { error: string; retryAfter: number };
    expect(body.error).toBe('Too many requests');
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  it('sets rate limit headers', async () => {
    const app = new Hono();
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 5 });

    app.use('*', limiter);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');

    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('uses custom key generator', async () => {
    const app = new Hono();
    const limiter = createRateLimiter({
      windowMs: 10000,
      maxRequests: 1,
      keyGenerator: (c) => c.req.query('user') ?? 'default',
    });

    app.use('*', limiter);
    app.get('/test', (c) => c.json({ ok: true }));

    const res1 = await app.request('/test?user=alice');
    const res2 = await app.request('/test?user=bob');
    const res3 = await app.request('/test?user=alice');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(429);
  });
});
