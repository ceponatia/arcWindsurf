import { describe, it, expect, vi } from 'vitest';
import type { BodyPartHygieneState } from '@minimal-rpg/schemas';
import { ActorStateHygieneRepository } from '../src/hygiene/actorStateRepository.js';

function buildStore(state?: {
  actorType: string;
  actorId: string;
  entityProfileId: string | null;
  lastEventSeq: bigint;
  state: unknown;
}) {
  return {
    getActorState: vi.fn(async () => state),
    upsertActorState: vi.fn(async () => undefined),
  };
}

describe('ActorStateHygieneRepository', () => {
  it('reads hygiene from actor_states', async () => {
    const store = buildStore({
      actorType: 'npc',
      actorId: 'npc-1',
      entityProfileId: null,
      lastEventSeq: 10n,
      state: {
        hygiene: {
          head: {
            points: 10,
            level: 2,
            lastUpdatedAt: '2026-01-22T00:00:00.000Z',
          },
        },
      },
    });
    const repo = new ActorStateHygieneRepository(store as never);

    const result = await repo.getState('session-1', 'npc-1');

    expect(result.bodyParts.head).toEqual({
      points: 10,
      level: 2,
      lastUpdatedAt: '2026-01-22T00:00:00.000Z',
    });
  });

  it('upserts a single body part', async () => {
    const store = buildStore({
      actorType: 'npc',
      actorId: 'npc-1',
      entityProfileId: null,
      lastEventSeq: 1n,
      state: { hygiene: {} },
    });
    const repo = new ActorStateHygieneRepository(store as never);

    await repo.upsertPart('session-1', 'npc-1', 'head', {
      points: 5,
      level: 1,
      lastUpdatedAt: '2026-01-22T00:00:00.000Z',
    } as BodyPartHygieneState);

    expect(store.upsertActorState).toHaveBeenCalled();
  });

  it('resetParts writes zeroed values in a single upsert', async () => {
    const store = buildStore({
      actorType: 'npc',
      actorId: 'npc-1',
      entityProfileId: null,
      lastEventSeq: 1n,
      state: { hygiene: { head: { points: 5, level: 1 } } },
    });
    const repo = new ActorStateHygieneRepository(store as never);

    await repo.resetParts('session-1', 'npc-1', ['head'], new Date('2026-01-22T00:00:00.000Z'));

    expect(store.upsertActorState).toHaveBeenCalledTimes(1);
  });

  it('initializeAll adds missing regions but preserves existing ones', async () => {
    const store = buildStore({
      actorType: 'npc',
      actorId: 'npc-1',
      entityProfileId: null,
      lastEventSeq: 1n,
      state: {
        hygiene: {
          head: {
            points: 1,
            level: 1,
            lastUpdatedAt: '2026-01-22T00:00:00.000Z',
          },
        },
      },
    });
    const repo = new ActorStateHygieneRepository(store as never);

    const state = await repo.initializeAll(
      'session-1',
      'npc-1',
      new Date('2026-01-22T00:00:00.000Z'),
      ['head', 'torso']
    );

    expect(Object.keys(state.bodyParts)).toEqual(['head', 'torso']);
    expect(state.bodyParts.head?.points).toBe(1);
    expect(store.upsertActorState).toHaveBeenCalledTimes(1);
  });
});
