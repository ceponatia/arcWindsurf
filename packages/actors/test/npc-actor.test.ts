import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NpcActor } from '../src/npc/npc-actor.js';
import { actorRegistry } from '../src/registry/actor-registry.js';
import type { WorldEvent } from '@minimal-rpg/schemas';

describe('NpcActor', () => {
  let actor: NpcActor;

  beforeEach(() => {
    actor = new NpcActor({
      id: 'test-npc-1',
      type: 'npc',
      npcId: 'barkeep',
      sessionId: 'test-session',
      locationId: 'tavern',
    });
  });

  afterEach(() => {
    actor.stop();
  });

  it('should create an NPC actor', () => {
    expect(actor.id).toBe('test-npc-1');
    expect(actor.type).toBe('npc');
    expect(actor.sessionId).toBe('test-session');
  });

  it('should start and stop', () => {
    actor.start();
    expect(actor.getMachineState()).toBeDefined();

    actor.stop();
  });

  it('should receive events', () => {
    actor.start();

    const event: WorldEvent = {
      type: 'TICK',
      tick: 1,
      timestamp: new Date(),
    };

    actor.send(event);

    // Event should be processed
    expect(actor.getMachineState()).toBeDefined();
  });

  it('should get snapshot', () => {
    const snapshot = actor.getSnapshot();

    expect(snapshot.id).toBe('test-npc-1');
    expect(snapshot.type).toBe('npc');
    expect(snapshot.locationId).toBe('tavern');
    expect(snapshot.sessionId).toBe('test-session');
  });
});

describe('ActorRegistry', () => {
  beforeEach(() => {
    // Clear registry
    actorRegistry.getAll().forEach((a) => actorRegistry.despawn(a.id));
  });

  it('should spawn an NPC actor', () => {
    const actor = actorRegistry.spawn({
      id: 'npc-1',
      type: 'npc',
      npcId: 'barkeep',
      sessionId: 'session-1',
      locationId: 'tavern',
    });

    expect(actor).toBeDefined();
    expect(actorRegistry.has('npc-1')).toBe(true);
  });

  it('should despawn an actor', () => {
    actorRegistry.spawn({
      id: 'npc-1',
      type: 'npc',
      npcId: 'barkeep',
      sessionId: 'session-1',
      locationId: 'tavern',
    });

    actorRegistry.despawn('npc-1');

    expect(actorRegistry.has('npc-1')).toBe(false);
  });

  it('should get actors for a session', () => {
    actorRegistry.spawn({
      id: 'npc-1',
      type: 'npc',
      npcId: 'barkeep',
      sessionId: 'session-1',
      locationId: 'tavern',
    });

    actorRegistry.spawn({
      id: 'npc-2',
      type: 'npc',
      npcId: 'merchant',
      sessionId: 'session-1',
      locationId: 'market',
    });

    const actors = actorRegistry.getForSession('session-1');
    expect(actors).toHaveLength(2);
  });

  it('should despawn all actors for a session', () => {
    actorRegistry.spawn({
      id: 'npc-1',
      type: 'npc',
      npcId: 'barkeep',
      sessionId: 'session-1',
      locationId: 'tavern',
    });

    actorRegistry.spawn({
      id: 'npc-2',
      type: 'npc',
      npcId: 'merchant',
      sessionId: 'session-1',
      locationId: 'market',
    });

    actorRegistry.despawnSession('session-1');

    expect(actorRegistry.getForSession('session-1')).toHaveLength(0);
  });
});
