import { describe, it, expect, beforeEach } from 'vitest';
import { actorRegistry } from '../src/registry/actor-registry.js';

describe('registry/actor-registry errors', () => {
  beforeEach(() => {
    actorRegistry.getAll().forEach((actor) => actorRegistry.despawn(actor.id));
  });

  it('throws when spawning duplicate actor ids', () => {
    actorRegistry.spawn({
      id: 'npc-1',
      type: 'npc',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
    });

    expect(() =>
      actorRegistry.spawn({
        id: 'npc-1',
        type: 'npc',
        npcId: 'npc-1',
        sessionId: 'session-1',
        locationId: 'loc-1',
      })
    ).toThrow('already exists');
  });

  it('throws when npcId is missing for npc', () => {
    expect(() =>
      actorRegistry.spawn({
        id: 'npc-2',
        type: 'npc',
        sessionId: 'session-1',
        locationId: 'loc-1',
      } as never)
    ).toThrow('npcId required');
  });

  it('throws on unknown actor types', () => {
    expect(() =>
      actorRegistry.spawn({
        id: 'mystery-1',
        type: 'system',
        sessionId: 'session-1',
        locationId: 'loc-1',
      } as never)
    ).toThrow('Unknown actor type');
  });

  it('throws when despawning missing actors', () => {
    expect(() => actorRegistry.despawn('missing')).toThrow('not found');
  });

  it('despawns all actors in a session', () => {
    actorRegistry.spawn({
      id: 'npc-1',
      type: 'npc',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
    });
    actorRegistry.spawn({
      id: 'npc-2',
      type: 'npc',
      npcId: 'npc-2',
      sessionId: 'session-1',
      locationId: 'loc-1',
    });

    actorRegistry.despawnSession('session-1');

    expect(actorRegistry.count()).toBe(0);
  });
});
