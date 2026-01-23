import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};

vi.mock('../src/connection/index.js', () => ({
  drizzle: mockDb,
}));

import {
  upsertActorState,
  bulkUpsertActorStates,
  getActorState,
  listActorStatesForSession,
} from '../src/repositories/actor-states.js';

describe('actor-states repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts actor states', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'actor-1' }]);

    const result = await upsertActorState({
      sessionId: 'session-1',
      actorType: 'npc',
      actorId: 'npc-1',
      state: {},
      lastEventSeq: 1n,
    });

    expect(result).toEqual({ id: 'actor-1' });
  });

  it('bulk upserts actor states', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'actor-1' }]);

    const result = await bulkUpsertActorStates([
      {
        sessionId: 'session-1',
        actorType: 'npc',
        actorId: 'npc-1',
        state: {},
        lastEventSeq: 1n,
      },
    ]);

    expect(result).toEqual([{ id: 'actor-1' }]);
  });

  it('bulk upsert returns empty for no inputs', async () => {
    const result = await bulkUpsertActorStates([]);
    expect(result).toEqual([]);
  });

  it('gets actor state and list for session', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'actor-1' }]);
    const state = await getActorState('session-1', 'actor-1');
    expect(state).toEqual({ id: 'actor-1' });

    mockDb.where.mockResolvedValueOnce([{ id: 'actor-2' }]);
    const list = await listActorStatesForSession('session-1');
    expect(list).toEqual([{ id: 'actor-2' }]);
  });
});
