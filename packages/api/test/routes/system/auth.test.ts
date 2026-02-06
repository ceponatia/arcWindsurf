import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const authRouteMocks = vi.hoisted(() => ({
  verifyLocalUserPasswordMock: vi.fn(),
  getOrCreateDefaultUserMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  verifyLocalUserPassword: authRouteMocks.verifyLocalUserPasswordMock,
  getOrCreateDefaultUser: authRouteMocks.getOrCreateDefaultUserMock,
}));

vi.mock('../../../../src/middleware/rate-limiter.js', () => ({
  loginRateLimiter: async (_c: unknown, next: () => Promise<void>) => next(),
}));

const { registerAuthRoutes } = await import('../../../../src/routes/system/auth.js');

const originalEnv = process.env;

function makeApp(authUser?: { identifier: string; role: 'user' | 'admin'; email: string | null }): Hono {
  const app = new Hono();
  if (authUser) {
    app.use('/auth/me', async (c, next) => {
      c.set('authUser' as never, authUser);
      await next();
    });
  }
  registerAuthRoutes(app);
  return app;
}

function setEnv(next: Record<string, string | undefined>): void {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
  process.env = env;
}

describe('routes/system/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv({ INVITE_ONLY: undefined, INVITE_EMAILS: undefined });

    authRouteMocks.getOrCreateDefaultUserMock.mockResolvedValue(undefined);
    authRouteMocks.verifyLocalUserPasswordMock.mockResolvedValue({ ok: false });
    setEnv({ AUTH_SECRET: 'secret', NODE_ENV: 'test' });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 400 when login body is invalid', async () => {
    const app = makeApp();
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: { fieldErrors: Record<string, unknown> } };
    expect(body.ok).toBe(false);
    expect(body.error.fieldErrors).toBeTruthy();
  });

  it('returns 401 when credentials are invalid', async () => {
    authRouteMocks.verifyLocalUserPasswordMock.mockResolvedValue({ ok: false });

    const app = makeApp();
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'user@example.com', password: 'bad-pass' }),
    });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid credentials' });
    expect(authRouteMocks.getOrCreateDefaultUserMock).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when auth secret is missing', async () => {
    authRouteMocks.verifyLocalUserPasswordMock.mockResolvedValue({
      ok: true,
      user: { identifier: 'user@example.com', role: 'user' },
    });
    setEnv({ AUTH_SECRET: undefined, NODE_ENV: 'production' });

    const app = makeApp();
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'user@example.com', password: 'pass-123' }),
    });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'AUTH_SECRET is required' });
  });

  it('returns token and user when login succeeds', async () => {
    authRouteMocks.verifyLocalUserPasswordMock.mockResolvedValue({
      ok: true,
      user: { identifier: 'admin@example.com', role: 'admin' },
    });

    const app = makeApp();
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@example.com', password: 'pass-123' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      token: string;
      user: { identifier: string; role: string };
    };
    expect(body.ok).toBe(true);
    expect(body.user).toEqual({ identifier: 'admin@example.com', role: 'admin' });
    expect(body.token.split('.')).toHaveLength(3);
  });

  it('returns null user for /auth/me when no auth user is attached', async () => {
    const app = makeApp();
    const res = await app.request('/auth/me');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, user: null });
  });

  it('enforces invite-only filtering on /auth/me', async () => {
    setEnv({ INVITE_ONLY: 'true', INVITE_EMAILS: 'allowed@example.com' });
    const app = makeApp({ identifier: 'user@example.com', role: 'user', email: 'other@example.com' });
    const res = await app.request('/auth/me');

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Forbidden' });
  });

  it('allows invited users on /auth/me (case-insensitive)', async () => {
    setEnv({ INVITE_ONLY: 'true', INVITE_EMAILS: 'Allowed@Example.com' });
    const app = makeApp({
      identifier: 'user@example.com',
      role: 'user',
      email: 'allowed@example.com',
    });
    const res = await app.request('/auth/me');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      user: {
        identifier: 'user@example.com',
        role: 'user',
        email: 'allowed@example.com',
      },
    });
  });
});
