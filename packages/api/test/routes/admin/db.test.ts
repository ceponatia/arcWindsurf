import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const adminDbMocks = vi.hoisted(() => ({
  getDbOverviewMock: vi.fn(),
  getDbPathInfoMock: vi.fn(),
  deleteDbRowMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  getDbOverview: adminDbMocks.getDbOverviewMock,
  getDbPathInfo: adminDbMocks.getDbPathInfoMock,
  deleteDbRow: adminDbMocks.deleteDbRowMock,
}));

vi.mock('../../../src/auth/middleware.js', () => ({
  requireAdmin: async (_c: unknown, next: () => Promise<void>) => next(),
}));

interface AdminDbModule {
  registerAdminDbRoutes: (app: Hono) => void;
}

const { registerAdminDbRoutes } = (await import(
  '../../../src/routes/admin/db.js'
)) as AdminDbModule;

/**
 * Build a Hono app with admin DB routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerAdminDbRoutes(app);
  return app;
}

describe('routes/admin/db', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns DB overview data', async () => {
    adminDbMocks.getDbOverviewMock.mockResolvedValue({
      ok: true,
      models: [{ model: 'users', rows: [] }],
    });

    const app = makeApp();
    const res = await app.request('/admin/db/overview');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      models: [{ model: 'users', rows: [] }],
    });
  });

  it('returns 500 when overview fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    adminDbMocks.getDbOverviewMock.mockRejectedValue(new Error('boom'));

    const app = makeApp();
    const res = await app.request('/admin/db/overview');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Failed to load DB overview' });

    errorSpy.mockRestore();
  });

  it('returns DB path info', async () => {
    adminDbMocks.getDbPathInfoMock.mockResolvedValue({
      ok: true,
      dbUrl: 'file:db.sqlite',
      dbPath: '/data/db.sqlite',
    });

    const app = makeApp();
    const res = await app.request('/admin/db/path');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      dbUrl: 'file:db.sqlite',
      dbPath: '/data/db.sqlite',
    });
  });

  it('returns 204 when deletion succeeds', async () => {
    adminDbMocks.deleteDbRowMock.mockResolvedValue(undefined);

    const app = makeApp();
    const res = await app.request('/admin/db/users/user-1', { method: 'DELETE' });

    expect(res.status).toBe(204);
  });

  it('returns 404 when deletion target is missing', async () => {
    adminDbMocks.deleteDbRowMock.mockRejectedValue(new Error('Not found'));

    const app = makeApp();
    const res = await app.request('/admin/db/users/user-1', { method: 'DELETE' });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Not found' });
  });

  it('returns 400 for unsupported model deletions', async () => {
    adminDbMocks.deleteDbRowMock.mockRejectedValue(new Error('Unknown model'));

    const app = makeApp();
    const res = await app.request('/admin/db/unknown/user-1', { method: 'DELETE' });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Unknown model' });
  });

  it('returns 400 when deletion is restricted', async () => {
    adminDbMocks.deleteDbRowMock.mockRejectedValue(new Error('Delete only supported for actors'));

    const app = makeApp();
    const res = await app.request('/admin/db/actors/actor-1', { method: 'DELETE' });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'Delete only supported for actors',
    });
  });

  it('returns 500 for unexpected deletion errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    adminDbMocks.deleteDbRowMock.mockRejectedValue(new Error('timeout'));

    const app = makeApp();
    const res = await app.request('/admin/db/users/user-2', { method: 'DELETE' });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Failed to delete row' });

    errorSpy.mockRestore();
  });
});
