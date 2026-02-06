import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const turnMocks = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  listActorStatesForSessionMock: vi.fn(),
  getEntityProfileMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
  getEnvValueMock: vi.fn(),
  actorRegistryHasMock: vi.fn(),
  actorRegistrySpawnMock: vi.fn(),
  worldBusSubscribeMock: vi.fn(),
  worldBusUnsubscribeMock: vi.fn(),
  worldBusEmitMock: vi.fn(),
  dialogueStartMock: vi.fn(),
  physicsStartMock: vi.fn(),
  timeStartMock: vi.fn(),
  socialStartMock: vi.fn(),
  rulesStartMock: vi.fn(),
  schedulerStartMock: vi.fn(),
}));

const busHandlers = new Set<(event: { sessionId?: string }) => void>();

vi.mock('../../../src/middleware/rate-limiter.js', () => ({
  turnRateLimiter: async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: turnMocks.getOwnerEmailMock,
}));

vi.mock('../../../src/db/sessionsClient.js', () => ({
  getSession: turnMocks.getSessionMock,
}));

vi.mock('@minimal-rpg/db/node', () => ({
  listActorStatesForSession: turnMocks.listActorStatesForSessionMock,
  getEntityProfile: turnMocks.getEntityProfileMock,
}));

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    subscribe: turnMocks.worldBusSubscribeMock,
    unsubscribe: turnMocks.worldBusUnsubscribeMock,
    emit: turnMocks.worldBusEmitMock,
  },
}));

vi.mock('@minimal-rpg/actors', () => ({
  actorRegistry: {
    has: turnMocks.actorRegistryHasMock,
    spawn: turnMocks.actorRegistrySpawnMock,
  },
}));

vi.mock('@minimal-rpg/services', () => ({
  dialogueService: { start: turnMocks.dialogueStartMock },
  physicsService: { start: turnMocks.physicsStartMock },
  timeService: { start: turnMocks.timeStartMock },
  socialEngine: { start: turnMocks.socialStartMock },
  rulesEngine: { start: turnMocks.rulesStartMock },
  Scheduler: { start: turnMocks.schedulerStartMock },
}));

vi.mock('@minimal-rpg/llm', () => ({
  createOpenRouterProviderFromEnv: () => null,
  OpenAIProvider: class { },
}));

vi.mock('../../../src/utils/env.js', () => ({
  getEnvValue: turnMocks.getEnvValueMock,
}));

interface TurnRoutesModule {
  registerTurnRoutes: (app: Hono) => void;
}

const { registerTurnRoutes } = (await import('../../../src/routes/game/turns.js')) as TurnRoutesModule;

const ownerEmail = 'owner@example.com';
const sessionId = '11111111-1111-4111-8111-111111111111';

/**
 * Build a Hono app with turn routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerTurnRoutes(app);
  return app;
}

describe('routes/game/turns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    busHandlers.clear();

    turnMocks.getOwnerEmailMock.mockReturnValue(ownerEmail);
    turnMocks.getEnvValueMock.mockReturnValue(undefined);
    turnMocks.actorRegistryHasMock.mockReturnValue(false);
    turnMocks.worldBusSubscribeMock.mockImplementation((handler: (event: { sessionId?: string }) => void) => {
      busHandlers.add(handler);
    });
    turnMocks.worldBusUnsubscribeMock.mockImplementation((handler: (event: { sessionId?: string }) => void) => {
      busHandlers.delete(handler);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns 404 when session is missing', async () => {
    turnMocks.getSessionMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/turns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'Hello' }),
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'session not found' });
  });

  it('emits a turn and returns npc response', async () => {
    turnMocks.getSessionMock.mockResolvedValue({ id: sessionId });
    turnMocks.listActorStatesForSessionMock.mockResolvedValue([
      {
        actorType: 'npc',
        actorId: 'npc-1',
        entityProfileId: 'profile-1',
        state: {
          location: { currentLocationId: 'loc-1' },
          profileJson: JSON.stringify({ name: 'Nia' }),
        },
      },
    ]);

    turnMocks.worldBusEmitMock.mockImplementation((event: { sessionId?: string }) => {
      busHandlers.forEach((handler) => handler(event));
      busHandlers.forEach((handler) =>
        handler({
          type: 'SPOKE',
          actorId: 'npc-1',
          content: 'Greetings',
          sessionId,
          timestamp: new Date(),
        } as { sessionId?: string })
      );
    });

    const app = makeApp();

    vi.useFakeTimers();
    const requestPromise = app.request(`/sessions/${sessionId}/turns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'Hello' }),
    });

    await vi.runAllTimersAsync();
    const res = await requestPromise;

    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string; speaker?: { name?: string } };
    expect(body.message).toBe('Greetings');
    expect(body.speaker?.name).toBe('Nia');
    expect(turnMocks.actorRegistrySpawnMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'npc-1', locationId: 'loc-1' })
    );
  });

  it('returns a quiet response when no npc speaks', async () => {
    turnMocks.getSessionMock.mockResolvedValue({ id: sessionId });
    turnMocks.listActorStatesForSessionMock.mockResolvedValue([]);

    turnMocks.worldBusEmitMock.mockImplementation((event: { sessionId?: string }) => {
      busHandlers.forEach((handler) => handler(event));
    });

    const app = makeApp();

    vi.useFakeTimers();
    const requestPromise = app.request(`/sessions/${sessionId}/turns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'Hello' }),
    });

    await vi.runAllTimersAsync();
    const res = await requestPromise;

    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string; speaker?: unknown };
    expect(body.message).toBe('The world is quiet.');
    expect(body.speaker).toBeUndefined();
  });
});
