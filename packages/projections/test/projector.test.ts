import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Projector } from '../src/projector.js';
import type { Projection } from '../src/types.js';

const dbMocks = vi.hoisted(() => ({
  query: {
    sessionProjections: {
      findFirst: vi.fn(),
    },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}));

vi.mock('@minimal-rpg/db', () => ({
  db: dbMocks,
  events: {},
  sessionProjections: { sessionId: 'sessionId' },
  eq: vi.fn(),
  gt: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
}));

vi.mock('@minimal-rpg/schemas', () => ({
  WorldEventSchema: { parse: (value: unknown) => value },
}));

describe('Projector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads snapshot and updates state', async () => {
    dbMocks.query.sessionProjections.findFirst.mockResolvedValueOnce({
      session: { status: 'active', currentTick: 1 },
      lastEventSeq: 2n,
    });

    const projection: Projection<{ status: string; currentTick: number }> = {
      name: 'session',
      initialState: { status: 'inactive', currentTick: 0 },
      reducer: (state) => state,
    };

    const projector = new Projector(projection, 'session-1');
    await projector.loadSnapshot();

    expect(projector.getState()).toEqual({ status: 'active', currentTick: 1 });
    expect(projector.getLastSequence()).toBe(2n);
  });

  it('replays events and advances sequence', async () => {
    dbMocks.query.sessionProjections.findFirst.mockResolvedValueOnce(null);
    dbMocks.limit
      .mockResolvedValueOnce([
        { sequence: 1n, payload: { type: 'TICK', tick: 2 } },
        { sequence: 2n, payload: { type: 'TICK', tick: 3 } },
      ])
      .mockResolvedValueOnce([]);

    const projection: Projection<{ currentTick: number }> = {
      name: 'session',
      initialState: { currentTick: 0 },
      reducer: (state, event) => ({ ...state, currentTick: (event as { tick?: number }).tick ?? 0 }),
    };

    const projector = new Projector(projection, 'session-1');
    await projector.replay();

    expect(projector.getState().currentTick).toBe(3);
    expect(projector.getLastSequence()).toBe(2n);
  });

  it('applyEvent ignores out-of-order sequences', () => {
    const projection: Projection<{ currentTick: number }> = {
      name: 'session',
      initialState: { currentTick: 0 },
      reducer: (state, event) => ({ ...state, currentTick: (event as { tick?: number }).tick ?? 0 }),
    };

    const projector = new Projector(projection, 'session-1');
    projector.applyEvent({ type: 'TICK', tick: 1 } as never, 1n);
    projector.applyEvent({ type: 'TICK', tick: 2 } as never, 1n);

    expect(projector.getState().currentTick).toBe(1);
  });
});
