import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

import { handleListMessages } from '../../src/routes/game/sessions/session-messages.js';

const dbMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getEventsForSession: vi.fn(),
  getEntityProfile: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  ...dbMocks,
}));

function makeApp(): Hono {
  const app = new Hono();
  app.get('/sessions/:id/messages', (c) => handleListMessages(c));
  return app;
}

describe('routes/sessions GET /sessions/:id/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not 500 when a SPOKE event actorId is not a UUID and maps player:* to role user', async () => {
    dbMocks.getSession.mockResolvedValue({
      id: '89dcf560-f144-4bc6-a3cd-dad235ed4351',
      ownerEmail: 'local',
      name: 'test session',
      playerCharacterId: null,
      settingId: null,
      status: 'active',
      createdAt: new Date('2026-01-22T00:00:00.000Z'),
      updatedAt: new Date('2026-01-22T00:00:00.000Z'),
    });

    dbMocks.getEventsForSession.mockResolvedValue([
      {
        type: 'SPOKE',
        actorId: 'player:admin@example.com',
        payload: { content: 'hello' },
        timestamp: new Date('2026-01-22T00:00:00.000Z'),
        sequence: 1n,
      },
    ] as unknown);

    dbMocks.getEntityProfile.mockImplementation(async (id: string) => {
      if (String(id).includes(':')) {
        throw new Error('should not query entity_profiles with legacy actor ids');
      }
      return null;
    });

    const app = makeApp();
    const res = await app.request('/sessions/89dcf560-f144-4bc6-a3cd-dad235ed4351/messages');
    expect(res.status).toBe(200);

    const body = (await res.json()) as Array<{ role?: string; content?: string }>;
    expect(body[0]?.content).toBe('hello');
    expect(body[0]?.role).toBe('user');
  });
});
