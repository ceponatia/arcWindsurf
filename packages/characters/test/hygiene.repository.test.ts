import { describe, it, expect, vi } from 'vitest';
import type { BodyPartHygieneState } from '@minimal-rpg/schemas';
import { DbHygieneRepository } from '../src/hygiene/repository.js';

function buildDb() {
  return {
    npcHygieneState: {
      findMany: vi.fn(async () => [
        {
          npcId: 'npc-1',
          bodyPart: 'head',
          points: 10,
          level: 2,
          lastUpdatedAt: new Date('2026-01-22T00:00:00.000Z'),
        },
      ]),
      upsert: vi.fn(async () => undefined),
    },
  };
}

describe('DbHygieneRepository', () => {
  it('maps rows to hygiene state', async () => {
    const db = buildDb();
    const repo = new DbHygieneRepository(db as never);

    const state = await repo.getState('session-1', 'npc-1');

    expect(state.bodyParts.head).toEqual({
      points: 10,
      level: 2,
      lastUpdatedAt: '2026-01-22T00:00:00.000Z',
    });
  });

  it('upserts part with dates', async () => {
    const db = buildDb();
    const repo = new DbHygieneRepository(db as never);

    await repo.upsertPart('session-1', 'npc-1', 'head', {
      points: 5,
      level: 1,
      lastUpdatedAt: '2026-01-22T00:00:00.000Z',
    } as BodyPartHygieneState);

    expect(db.npcHygieneState.upsert).toHaveBeenCalled();
  });

  it('resetParts writes zeroed values', async () => {
    const db = buildDb();
    const repo = new DbHygieneRepository(db as never);

    await repo.resetParts('session-1', 'npc-1', ['head'], new Date('2026-01-22T00:00:00.000Z'));

    expect(db.npcHygieneState.upsert).toHaveBeenCalled();
  });

  it('initializeAll writes all regions', async () => {
    const db = buildDb();
    const repo = new DbHygieneRepository(db as never);

    const state = await repo.initializeAll('session-1', 'npc-1', new Date('2026-01-22T00:00:00.000Z'), ['head', 'torso']);

    expect(Object.keys(state.bodyParts)).toEqual(['head', 'torso']);
    expect(db.npcHygieneState.upsert).toHaveBeenCalledTimes(2);
  });
});
