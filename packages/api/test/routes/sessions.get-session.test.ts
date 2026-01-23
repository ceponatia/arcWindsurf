import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

import { handleGetSession } from '../../src/routes/game/sessions/session-crud.js';

const dbMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  deleteSession: vi.fn(),
  getPromptTag: vi.fn(),
  createSessionTagBinding: vi.fn(),
  upsertActorState: vi.fn(),
  getSessionProjection: vi.fn(),
  getEventsForSession: vi.fn(),
  getEntityProfile: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  ...dbMocks,
}));

function makeApp(): Hono {
  const app = new Hono();

  // Isolate the handler under test to avoid importing unrelated route modules.
  app.get('/sessions/:id', (c) => handleGetSession(c));
  return app;
}

describe('routes/sessions GET /sessions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not 500 when a SPOKE event actorId is not a UUID', async () => {
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

    dbMocks.getSessionProjection.mockResolvedValue({ ok: true } as unknown);
    dbMocks.getEventsForSession.mockResolvedValue([
      {
        type: 'SPOKE',
        actorId: 'player:admin@example.com',
        payload: { content: 'hello' },
        timestamp: new Date('2026-01-22T00:00:00.000Z'),
        sequence: 1n,
      },
    ] as unknown);

    // If this gets called with a non-UUID, the previous buggy code would crash.
    dbMocks.getEntityProfile.mockImplementation(async (id: string) => {
      if (String(id).includes(':')) {
        throw new Error('should not query entity_profiles with legacy actor ids');
      }
      return null;
    });

    const app = makeApp();
    const res = await app.request('/sessions/89dcf560-f144-4bc6-a3cd-dad235ed4351');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { messages?: Array<{ content: string }> };
    expect(body.messages?.[0]?.content).toBe('hello');
  });
});
