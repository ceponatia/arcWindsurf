import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const adminSessionMocks = vi.hoisted(() => ({
  getEventsForSessionMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  getEventsForSession: adminSessionMocks.getEventsForSessionMock,
}));

vi.mock('../../../../src/auth/middleware.js', () => ({
  requireAdmin: async (_c: unknown, next: () => Promise<void>) => next(),
}));

interface AdminSessionModule {
  registerAdminSessionRoutes: (app: Hono) => void;
}

const { registerAdminSessionRoutes } = (await import(
  '../../../src/routes/admin/sessions.js'
)) as AdminSessionModule;

/**
 * Build a Hono app with admin session routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerAdminSessionRoutes(app);
  return app;
}

describe('routes/admin/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns tooling failures from session events', async () => {
    const createdAt = new Date('2026-02-01T10:00:00.000Z');
    adminSessionMocks.getEventsForSessionMock.mockResolvedValue([
      {
        sequence: 1,
        timestamp: createdAt,
        payload: {
          playerInput: 'hello',
          events: [
            { type: 'tooling-failure', timestamp: '2026-02-01T10:00:00Z', payload: { code: 500 } },
            { type: 'other', payload: { ok: true } },
          ],
        },
      },
    ]);

    const app = makeApp();
    const res = await app.request('/admin/sessions/session-1/tooling-failures');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      sessionId: 'session-1',
      limit: 50,
      count: 1,
      failures: [
        {
          turnIdx: 1,
          createdAt: createdAt.toISOString(),
          playerInput: 'hello',
          events: [
            {
              type: 'tooling-failure',
              timestamp: '2026-02-01T10:00:00Z',
              payload: { code: 500 },
            },
          ],
        },
      ],
    });
  });

  it('clamps the limit query parameter', async () => {
    adminSessionMocks.getEventsForSessionMock.mockResolvedValue([
      {
        sequence: 2,
        timestamp: new Date('2026-02-02T08:00:00.000Z'),
        payload: { events: [{ type: 'tooling-failure', payload: {} }] },
      },
    ]);

    const app = makeApp();
    const res = await app.request('/admin/sessions/session-1/tooling-failures?limit=500');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { limit: number };
    expect(body.limit).toBe(200);
  });

  it('defaults the limit when query is invalid', async () => {
    adminSessionMocks.getEventsForSessionMock.mockResolvedValue([]);

    const app = makeApp();
    const res = await app.request('/admin/sessions/session-1/tooling-failures?limit=oops');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { limit: number; failures: unknown[] };
    expect(body.limit).toBe(50);
    expect(body.failures).toEqual([]);
  });

  it('returns 500 when events lookup fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    adminSessionMocks.getEventsForSessionMock.mockRejectedValue(new Error('db fail'));

    const app = makeApp();
    const res = await app.request('/admin/sessions/session-1/tooling-failures');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to load tooling failure events',
    });

    errorSpy.mockRestore();
  });
});
