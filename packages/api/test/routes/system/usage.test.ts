import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const usageRouteMocks = vi.hoisted(() => {
  const orderByMock = vi.fn();
  const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
  const fromMock = vi.fn(() => ({ where: whereMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));

  return {
    selectMock,
    fromMock,
    whereMock,
    orderByMock,
    eqMock: vi.fn(() => Symbol('eq')),
    descMock: vi.fn(() => Symbol('desc')),
  };
});

vi.mock('@minimal-rpg/db/node', () => ({
  drizzle: {
    select: usageRouteMocks.selectMock,
  },
  sessions: {
    playerCharacterId: 'playerCharacterId',
    settingId: 'settingId',
    createdAt: 'createdAt',
  },
  actorStates: {
    entityProfileId: 'entityProfileId',
    createdAt: 'createdAt',
  },
  eq: usageRouteMocks.eqMock,
  desc: usageRouteMocks.descMock,
}));

const { registerEntityUsageRoutes } = await import('../../../../src/routes/system/usage.js');

function makeApp(): Hono {
  const app = new Hono();
  registerEntityUsageRoutes(app);
  return app;
}

describe('routes/system/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns character usage summary', async () => {
    const createdAt = new Date('2026-01-01T12:00:00.000Z');
    usageRouteMocks.orderByMock.mockResolvedValue([
      { id: 'sess-1', createdAt },
      { id: 'sess-2', createdAt },
    ]);

    const app = makeApp();
    const res = await app.request('/entity-usage/characters/char-1');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      entityId: 'char-1',
      entityType: 'character',
      sessions: [
        { sessionId: 'sess-1', createdAt: createdAt.toISOString(), role: 'player' },
        { sessionId: 'sess-2', createdAt: createdAt.toISOString(), role: 'player' },
      ],
      totalCount: 2,
    });
  });

  it('returns setting usage summary', async () => {
    const createdAt = new Date('2026-01-02T08:00:00.000Z');
    usageRouteMocks.orderByMock.mockResolvedValue([{ id: 'sess-10', createdAt }]);

    const app = makeApp();
    const res = await app.request('/entity-usage/settings/setting-1');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      entityId: 'setting-1',
      entityType: 'setting',
      sessions: [{ sessionId: 'sess-10', createdAt: createdAt.toISOString() }],
      totalCount: 1,
    });
  });

  it('returns persona usage summary', async () => {
    const createdAt = new Date('2026-01-03T09:30:00.000Z');
    usageRouteMocks.orderByMock.mockResolvedValue([
      { sessionId: 'sess-100', createdAt, actorType: 'npc' },
    ]);

    const app = makeApp();
    const res = await app.request('/entity-usage/personas/persona-1');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      entityId: 'persona-1',
      entityType: 'persona',
      sessions: [{ sessionId: 'sess-100', createdAt: createdAt.toISOString(), role: 'npc' }],
      totalCount: 1,
    });
  });

  it('returns 500 when usage query fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    usageRouteMocks.orderByMock.mockRejectedValue(new Error('db failure'));

    const app = makeApp();
    const res = await app.request('/entity-usage/characters/char-1');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to fetch character usage',
    });

    errorSpy.mockRestore();
  });

  it('returns 500 when setting usage query fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    usageRouteMocks.orderByMock.mockRejectedValue(new Error('db failure'));

    const app = makeApp();
    const res = await app.request('/entity-usage/settings/setting-1');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to fetch setting usage',
    });

    errorSpy.mockRestore();
  });
});
