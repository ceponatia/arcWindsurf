import { describe, it, expect } from 'vitest';
import type { WorldEvent } from '@minimal-rpg/schemas';
import { PerceptionLayer } from '../src/npc/perception.js';
import type { NpcRuntimeState } from '../src/npc/types.js';

function buildState(): NpcRuntimeState {
  return {
    id: 'npc-1',
    type: 'npc',
    npcId: 'npc-1',
    sessionId: 'session-1',
    locationId: 'loc-1',
    spawnedAt: new Date('2026-01-22T00:00:00.000Z'),
    lastActiveAt: new Date('2026-01-22T00:00:00.000Z'),
    recentEvents: [],
    goals: [],
  };
}

describe('npc/perception', () => {
  it('filters events by session and location', () => {
    const state = buildState();
    const events: WorldEvent[] = [
      { type: 'SPOKE', sessionId: 'session-1', actorId: 'player-1' } as unknown as WorldEvent,
      { type: 'SPOKE', sessionId: 'session-2', actorId: 'player-1' } as unknown as WorldEvent,
      { type: 'MOVED', sessionId: 'session-1', locationId: 'loc-2' } as unknown as WorldEvent,
    ];

    const result = PerceptionLayer.filterRelevantEvents(events, state);

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe('SPOKE');
  });

  it('accepts TICK and SESSION events even when location differs', () => {
    const state = buildState();
    const events: WorldEvent[] = [
      { type: 'TICK', sessionId: 'session-1', locationId: 'loc-2' } as unknown as WorldEvent,
      { type: 'SESSION_UPDATED', sessionId: 'session-1', locationId: 'loc-2' } as unknown as WorldEvent,
    ];

    const result = PerceptionLayer.filterRelevantEvents(events, state);

    expect(result).toHaveLength(2);
  });

  it('filters events targeted at other actors', () => {
    const state = buildState();
    const events: WorldEvent[] = [
      { type: 'SPOKE', sessionId: 'session-1', targetActorId: 'npc-2' } as unknown as WorldEvent,
      { type: 'SPOKE', sessionId: 'session-1', targetActorId: 'npc-1' } as unknown as WorldEvent,
    ];

    const result = PerceptionLayer.filterRelevantEvents(events, state);

    expect(result).toHaveLength(1);
    expect((result[0] as Record<string, unknown>).targetActorId).toBe('npc-1');
  });

  it('reads session and location from payload', () => {
    const state = buildState();
    const events: WorldEvent[] = [
      {
        type: 'SPOKE',
        payload: { sessionId: 'session-1', locationId: 'loc-1' },
      } as unknown as WorldEvent,
      {
        type: 'SPOKE',
        payload: { sessionId: 'session-2', locationId: 'loc-1' },
      } as unknown as WorldEvent,
    ];

    const result = PerceptionLayer.filterRelevantEvents(events, state);

    expect(result).toHaveLength(1);
  });

  it('builds context with nearby actors from MOVED events', () => {
    const state = buildState();
    const events: WorldEvent[] = [
      { type: 'MOVED', sessionId: 'session-1', actorId: 'player-1', toLocationId: 'loc-1' } as unknown as WorldEvent,
      { type: 'MOVED', sessionId: 'session-1', actorId: 'player-2', toLocationId: 'loc-2' } as unknown as WorldEvent,
    ];

    const context = PerceptionLayer.buildContext(events, state);

    expect(context.relevantEvents).toHaveLength(1);
    expect(context.nearbyActors).toEqual(['player-1']);
  });

  it('treats MOVED events as relevant to fromLocationId and toLocationId', () => {
    const state = buildState();
    const events: WorldEvent[] = [
      {
        type: 'MOVED',
        sessionId: 'session-1',
        actorId: 'player-1',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
      } as unknown as WorldEvent,
    ];

    const result = PerceptionLayer.filterRelevantEvents(events, state);

    expect(result).toHaveLength(1);
  });
});
