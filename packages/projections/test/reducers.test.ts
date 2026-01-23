import { describe, it, expect, vi } from 'vitest';
import { sessionReducer, initialSessionState } from '../src/reducers/session.js';
import { locationReducer, initialLocationsState } from '../src/reducers/location.js';
import { npcReducer, initialNpcsState } from '../src/reducers/npc.js';

const nowSpy = vi.spyOn(global.Date, 'now');
nowSpy.mockImplementation(() => 1_700_000_000_000);

describe('session reducer', () => {
  it('handles start, tick, and end', () => {
    const started = sessionReducer(initialSessionState, { type: 'SESSION_START' } as never);
    expect(started.status).toBe('active');

    const ticked = sessionReducer(started, { type: 'TICK', tick: 5 } as never);
    expect(ticked.currentTick).toBe(5);

    const ended = sessionReducer(ticked, { type: 'SESSION_END' } as never);
    expect(ended.status).toBe('inactive');
  });
});

describe('location reducer', () => {
  it('handles actor spawn, move, and item drop', () => {
    const spawned = locationReducer(initialLocationsState, {
      type: 'ACTOR_SPAWN',
      actorId: 'npc-1',
      actorType: 'npc',
      locationId: 'loc-1',
    } as never);
    expect(spawned['loc-1']?.actors).toContain('npc-1');
  });

  it('removes actor on despawn', () => {
    const withActor = locationReducer(initialLocationsState, {
      type: 'ACTOR_SPAWN',
      actorId: 'npc-1',
      actorType: 'npc',
      locationId: 'loc-1',
    } as never);

    const despawned = locationReducer(withActor, {
      type: 'ACTOR_DESPAWN',
      actorId: 'npc-1',
    } as never);

    expect(despawned['loc-1']?.actors).toEqual([]);
  });
});

describe('npc reducer', () => {
  it('handles damage and inventory changes', () => {
    const spawned = npcReducer(initialNpcsState, {
      type: 'ACTOR_SPAWN',
      actorId: 'npc-1',
      actorType: 'npc',
      locationId: 'loc-1',
    } as never);

    const damaged = npcReducer(spawned, { type: 'DAMAGED', actorId: 'npc-1', amount: 25 } as never);
    expect(damaged['npc-1']?.health.current).toBe(75);

    const acquired = npcReducer(damaged, { type: 'ITEM_ACQUIRED', actorId: 'npc-1', itemId: 'item-1' } as never);
    expect(acquired['npc-1']?.inventory).toContain('item-1');

    const dropped = npcReducer(acquired, { type: 'ITEM_DROPPED', actorId: 'npc-1', itemId: 'item-1' } as never);
    expect(dropped['npc-1']?.inventory).toEqual([]);
  });
});
