import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { BODY_REGIONS, getRecordOptional } from '@minimal-rpg/schemas';

const hygieneMocks = vi.hoisted(() => ({
  getActorStateMock: vi.fn(),
  upsertActorStateMock: vi.fn(),
  loadSensoryModifiersMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  getActorState: hygieneMocks.getActorStateMock,
  upsertActorState: hygieneMocks.upsertActorStateMock,
}));

vi.mock('../../../src/loaders/sensory-modifiers-loader.js', () => ({
  loadSensoryModifiers: hygieneMocks.loadSensoryModifiersMock,
}));

interface HygieneRoutesModule {
  registerHygieneRoutes: (app: Hono) => void;
}

const { registerHygieneRoutes } = (await import(
  '../../../src/routes/game/hygiene.js'
)) as HygieneRoutesModule;

const sessionId = '11111111-1111-4111-8111-111111111111';
const npcId = 'npc-1';
const bodyPart = BODY_REGIONS[0] ?? 'torso';

const actorStateStore = new Map<string, { actorType: string; actorId: string; state: Record<string, unknown>; lastEventSeq: bigint | null }>();

function stateKey(session: string, npc: string): string {
  return `${session}:${npc}`;
}

/**
 * Build a Hono app with hygiene routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerHygieneRoutes(app);
  return app;
}

describe('routes/game/hygiene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actorStateStore.clear();

    const baseState = {
      actorType: 'npc',
      actorId: npcId,
      state: {
        hygiene: {
          [bodyPart]: {
            points: 1,
            level: 1,
            lastUpdatedAt: new Date().toISOString(),
          },
        },
      },
      lastEventSeq: 0n,
    };
    actorStateStore.set(stateKey(sessionId, npcId), baseState);

    hygieneMocks.getActorStateMock.mockImplementation((session: string, npc: string) => {
      return actorStateStore.get(stateKey(session, npc)) ?? null;
    });

    hygieneMocks.upsertActorStateMock.mockImplementation(
      ({
        sessionId: session,
        actorId,
        state,
      }: {
        sessionId: string;
        actorId: string;
        state: unknown;
      }) => {
        const existing = actorStateStore.get(stateKey(session, actorId));
        actorStateStore.set(stateKey(session, actorId), {
          actorType: existing?.actorType ?? 'npc',
          actorId,
          state: state as Record<string, unknown>,
          lastEventSeq: existing?.lastEventSeq ?? 0n,
        });
      }
    );

    hygieneMocks.loadSensoryModifiersMock.mockResolvedValue({
      data: {
        bodyParts: {},
        decayRates: {},
      },
      bodyParts: {
        [bodyPart]: {
          smell: {
            '0': '',
            '1': 'dusty',
            '2': 'musty',
            '3': 'rank',
            '4': 'overpowering',
          },
        },
      },
      decayRates: {
        [bodyPart]: {
          bodyPart,
          thresholds: [0, 10, 20, 30, 40, 50, 60],
          baseDecayPerTurn: 0,
        },
      },
      getModifier: () => '',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns hygiene state for an npc', async () => {
    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/npcs/${npcId}/hygiene`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { npcId: string };
    expect(body.npcId).toBe(npcId);
  });

  it('initializes hygiene state', async () => {
    const app = makeApp();
    const res = await app.request(
      `/sessions/${sessionId}/npcs/${npcId}/hygiene/initialize`,
      { method: 'POST' }
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { bodyParts: Record<string, { level: number }> };
    const partState = getRecordOptional(body.bodyParts, bodyPart);
    expect(partState?.level).toBe(0);
  });

  it('updates hygiene state', async () => {
    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/npcs/${npcId}/hygiene/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnsElapsed: 1 }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { bodyParts: Record<string, { points: number }> };
    const partState = getRecordOptional(body.bodyParts, bodyPart);
    expect(partState).toBeDefined();
  });

  it('cleans specified body parts', async () => {
    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/npcs/${npcId}/hygiene/clean`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyParts: [bodyPart] }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { bodyParts: Record<string, { points: number }> };
    const partState = getRecordOptional(body.bodyParts, bodyPart);
    expect(partState?.points).toBe(0);
  });

  it('applies hygiene events', async () => {
    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/npcs/${npcId}/hygiene/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'dirty', event: 'mud', bodyParts: [bodyPart] }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { npcId: string };
    expect(body.npcId).toBe(npcId);
  });

  it('returns sensory modifier for a body part', async () => {
    const app = makeApp();
    const res = await app.request(
      `/sessions/${sessionId}/npcs/${npcId}/hygiene/sensory/${bodyPart}/smell`
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { modifier: string };
    expect(body.modifier).toBeDefined();
  });
});
