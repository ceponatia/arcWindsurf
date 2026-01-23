import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { attachAuthUser, getAuthUser, requireAdmin, requireAuthIfEnabled } from '../../src/auth/middleware.js';
import { signAuthToken } from '../../src/auth/token.js';

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseAuthConfigMock: vi.fn(),
  verifySupabaseJwtMock: vi.fn(),
}));

vi.mock('../../src/auth/supabase.js', () => ({
  getSupabaseAuthConfig: supabaseMocks.getSupabaseAuthConfigMock,
  verifySupabaseJwt: supabaseMocks.verifySupabaseJwtMock,
}));

const originalEnv = process.env;

/**
 * Update process.env for test cases.
 */
function setEnv(next: Record<string, string | undefined>): void {
  process.env = { ...originalEnv, ...next };
}

/**
 * Build a basic Hono app with auth middlewares.
 */
function makeApp(): Hono {
  const app = new Hono();
  app.use('*', attachAuthUser);
  app.get('/check', (c) => {
    return c.json({ user: getAuthUser(c) });
  });
  return app;
}

/**
 * Create a signed auth token with a fresh expiration.
 */
function createAuthToken(sub: string, role: 'user' | 'admin'): string {
  const now = Math.floor(Date.now() / 1000);
  return signAuthToken({ sub, role, iat: now, exp: now + 3600 }, 'test-secret');
}

describe('auth/middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv({
      AUTH_SECRET: 'test-secret',
      BYPASS_AUTH: undefined,
      AUTH_REQUIRED: undefined,
      INVITE_ONLY: undefined,
      INVITE_EMAILS: undefined,
      DEBUG_AUTH: undefined,
    });
    supabaseMocks.getSupabaseAuthConfigMock.mockReturnValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('attaches local auth user from bearer token', async () => {
    const token = createAuthToken('user-1', 'user');

    const app = makeApp();
    const res = await app.request('/check', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { identifier: string; role: string } | null };
    expect(body.user?.identifier).toBe('user-1');
    expect(body.user?.role).toBe('user');
  });

  it('ignores non-bearer authorization headers', async () => {
    const app = makeApp();
    const res = await app.request('/check', {
      headers: { Authorization: 'Token abc' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it('bypasses auth when BYPASS_AUTH is enabled', async () => {
    setEnv({ BYPASS_AUTH: 'true' });

    const app = makeApp();
    const res = await app.request('/check');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { role: string; email: string } | null };
    expect(body.user?.role).toBe('admin');
    expect(body.user?.email).toBe('admin@example.com');
  });

  it('requires auth when AUTH_REQUIRED is enabled', async () => {
    setEnv({ AUTH_REQUIRED: 'true' });

    const app = new Hono();
    app.use('*', requireAuthIfEnabled);
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/protected');
    expect(res.status).toBe(401);
  });

  it('allows public paths when auth is required', async () => {
    setEnv({ AUTH_REQUIRED: 'true' });

    const app = new Hono();
    app.use('*', requireAuthIfEnabled);
    app.get('/health', (c) => c.json({ ok: true }));

    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('enforces invite-only access', async () => {
    setEnv({ AUTH_REQUIRED: 'true', INVITE_ONLY: 'true', INVITE_EMAILS: 'allowed@example.com' });

    const app = new Hono();
    app.use('*', (c, next) => {
      c.set('authUser' as never, { identifier: 'user-1', role: 'user', email: 'nope@example.com' });
      return next();
    });
    app.use('*', requireAuthIfEnabled);
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/protected');
    expect(res.status).toBe(403);
  });

  it('requires admin role when enforced', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      c.set('authUser' as never, { identifier: 'user-1', role: 'user', email: 'user@example.com' });
      return next();
    });
    app.use('*', requireAdmin);
    app.get('/admin', (c) => c.json({ ok: true }));

    const res = await app.request('/admin');
    expect(res.status).toBe(403);
  });

  it('passes when admin role is present', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      c.set('authUser' as never, { identifier: 'admin-1', role: 'admin', email: 'admin@example.com' });
      return next();
    });
    app.use('*', requireAdmin);
    app.get('/admin', (c) => c.json({ ok: true }));

    const res = await app.request('/admin');
    expect(res.status).toBe(200);
  });

  it('returns unauthorized when admin route has no user', async () => {
    const app = new Hono();
    app.use('*', requireAdmin);
    app.get('/admin', (c) => c.json({ ok: true }));

    const res = await app.request('/admin');
    expect(res.status).toBe(401);
  });

  it('uses supabase JWT verification when configured', async () => {
    supabaseMocks.getSupabaseAuthConfigMock.mockReturnValue({
      jwksUrl: 'https://jwks',
      issuers: ['issuer'],
      algorithms: ['RS256'],
    });
    supabaseMocks.verifySupabaseJwtMock.mockResolvedValue({
      ok: true,
      claims: { sub: 'user-2', email: 'user2@example.com' },
    });

    const token = createAuthToken('ignored', 'user');

    const app = makeApp();
    const res = await app.request('/check', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { identifier: string; email: string } | null };
    expect(body.user?.identifier).toBe('user2@example.com');
    expect(body.user?.email).toBe('user2@example.com');
  });

  it('logs debug info when DEBUG_AUTH is enabled', async () => {
    setEnv({ DEBUG_AUTH: 'true' });

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const app = makeApp();
    const res = await app.request('/check');

    expect(res.status).toBe(200);
    expect(infoSpy).toHaveBeenCalled();

    infoSpy.mockRestore();
  });

  it('skips auth on OPTIONS requests', async () => {
    setEnv({ AUTH_REQUIRED: 'true' });

    const app = new Hono();
    app.use('*', requireAuthIfEnabled);
    app.options('/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/protected', { method: 'OPTIONS' });
    expect(res.status).toBe(200);
  });

  it('does not set user when supabase verification fails', async () => {
    supabaseMocks.getSupabaseAuthConfigMock.mockReturnValue({
      jwksUrl: 'https://jwks',
      issuers: ['issuer'],
      algorithms: ['RS256'],
    });
    supabaseMocks.verifySupabaseJwtMock.mockResolvedValue({ ok: false, error: 'invalid' });

    const token = createAuthToken('user-3', 'user');

    const app = makeApp();
    const res = await app.request('/check', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it('does not set user when auth secret is missing', async () => {
    setEnv({ AUTH_SECRET: '' });

    const token = createAuthToken('user-4', 'user');

    const app = makeApp();
    const res = await app.request('/check', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it('uses invite list when email matches', async () => {
    setEnv({ AUTH_REQUIRED: 'true', INVITE_ONLY: 'true', INVITE_EMAILS: 'allowed@example.com' });

    const app = new Hono();
    app.use('*', (c, next) => {
      c.set('authUser' as never, { identifier: 'user-1', role: 'user', email: 'allowed@example.com' });
      return next();
    });
    app.use('*', requireAuthIfEnabled);
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/protected');
    expect(res.status).toBe(200);
  });

  it('rejects invite-only users without email', async () => {
    setEnv({ AUTH_REQUIRED: 'true', INVITE_ONLY: 'true', INVITE_EMAILS: 'allowed@example.com' });

    const app = new Hono();
    app.use('*', (c, next) => {
      c.set('authUser' as never, { identifier: 'user-1', role: 'user', email: null });
      return next();
    });
    app.use('*', requireAuthIfEnabled);
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/protected');
    expect(res.status).toBe(403);
  });
});
