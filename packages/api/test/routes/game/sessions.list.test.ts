import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const listMocks = vi.hoisted(() => ({
  listSessionsMock: vi.fn(),
  getEntityProfileMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  listSessions: listMocks.listSessionsMock,
  getEntityProfile: listMocks.getEntityProfileMock,
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: listMocks.getOwnerEmailMock,
}));

interface ListSessionsModule {
  handleListSessions: (c: { json: (value: unknown, status?: number) => Response }) => Promise<Response>;
}

const { handleListSessions } = (await import(
  '../../../src/routes/game/sessions/list-sessions.js'
)) as ListSessionsModule;

/**
 * Build a Hono app with list sessions handler registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  app.get('/sessions', (c) => handleListSessions(c));
  return app;
}

describe('routes/game/sessions list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMocks.getOwnerEmailMock.mockReturnValue('owner@example.com');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists sessions with resolved names', async () => {
    listMocks.listSessionsMock.mockResolvedValue([
      {
        id: 'session-1',
        name: 'Session 1',
        playerCharacterId: 'char-1',
        settingId: 'setting-1',
        status: 'active',
        createdAt: new Date('2026-02-06T12:00:00.000Z'),
        updatedAt: new Date('2026-02-06T12:30:00.000Z'),
      },
    ]);
    listMocks.getEntityProfileMock
      .mockResolvedValueOnce({ name: 'Hero' })
      .mockResolvedValueOnce({ name: 'World' });

    const app = makeApp();
    const res = await app.request('/sessions');
    const body = (await res.json()) as { characterName?: string; settingName?: string }[];

    expect(body[0]?.characterName).toBe('Hero');
    expect(body[0]?.settingName).toBe('World');
  });

  it('falls back to unknown names when profiles missing', async () => {
    listMocks.listSessionsMock.mockResolvedValue([
      {
        id: 'session-1',
        name: 'Session 1',
        playerCharacterId: 'char-1',
        settingId: 'setting-1',
        createdAt: new Date('2026-02-06T12:00:00.000Z'),
        updatedAt: new Date('2026-02-06T12:30:00.000Z'),
      },
    ]);
    listMocks.getEntityProfileMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request('/sessions');
    const body = (await res.json()) as { characterName?: string; settingName?: string }[];

    expect(body[0]?.characterName).toBe('Unknown Hero');
    expect(body[0]?.settingName).toBe('Unknown World');
  });
});
