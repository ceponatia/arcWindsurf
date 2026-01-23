import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const busMocks = vi.hoisted(() => ({
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  emit: vi.fn(),
}));

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    subscribe: busMocks.subscribe,
    unsubscribe: busMocks.unsubscribe,
    emit: busMocks.emit,
  },
}));

const sessionsClientMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('../../src/db/sessionsClient.js', () => ({
  getSession: sessionsClientMocks.getSession,
}));

const dbNodeMocks = vi.hoisted(() => ({
  listActorStatesForSession: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  listActorStatesForSession: dbNodeMocks.listActorStatesForSession,
}));

vi.mock('@minimal-rpg/actors', () => ({
  actorRegistry: {
    has: vi.fn(() => false),
    spawn: vi.fn(),
  },
}));

vi.mock('@minimal-rpg/services', () => ({
  dialogueService: { start: vi.fn() },
  physicsService: { start: vi.fn() },
  timeService: { start: vi.fn() },
  socialEngine: { start: vi.fn() },
  rulesEngine: { start: vi.fn() },
}));

describe('routes/sessions POST /sessions/:id/turns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always unsubscribes the world bus handler on errors after subscribe', async () => {
    sessionsClientMocks.getSession.mockResolvedValue({ id: '89dcf560-f144-4bc6-a3cd-dad235ed4351' });
    dbNodeMocks.listActorStatesForSession.mockResolvedValue([]);

    let subscribedHandler: unknown;
    busMocks.subscribe.mockImplementation(async (handler: unknown) => {
      subscribedHandler = handler;
    });

    busMocks.emit.mockImplementation(async () => {
      throw new Error('boom');
    });

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { registerTurnRoutes } = await import('../../src/routes/game/turns.js');

    const app = new Hono();
    registerTurnRoutes(app);

    let res: Response | null = null;
    try {
      res = await app.request('/sessions/89dcf560-f144-4bc6-a3cd-dad235ed4351/turns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: 'hi' }),
      });
    } catch {
      // Some Hono configurations may surface thrown handler errors as rejected promises.
      // Either way, the invariant we care about is that unsubscribe executes.
    }

    errSpy.mockRestore();
    warnSpy.mockRestore();

    expect(busMocks.subscribe).toHaveBeenCalledTimes(1);
    expect(subscribedHandler).toBeTruthy();

    expect(busMocks.unsubscribe).toHaveBeenCalledTimes(1);
    expect(busMocks.unsubscribe).toHaveBeenCalledWith(subscribedHandler);

    // If the error is translated into an HTTP response, it should not be 200.
    if (res) {
      expect(res.status).not.toBe(200);
    }
  });
});
