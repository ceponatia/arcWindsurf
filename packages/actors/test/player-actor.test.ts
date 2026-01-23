import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorldEvent } from '@minimal-rpg/schemas';
import { PlayerActor } from '../src/player/player-actor.js';

describe('player/player-actor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts and stops idempotently', () => {
    const actor = new PlayerActor({
      id: 'player-1',
      type: 'player',
      sessionId: 'session-1',
      locationId: 'loc-1',
    });

    actor.start();
    actor.start();

    actor.stop();
    actor.stop();
  });

  it('logs received events', () => {
    const actor = new PlayerActor({
      id: 'player-1',
      type: 'player',
      sessionId: 'session-1',
      locationId: 'loc-1',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    actor.send({ type: 'TICK' } as WorldEvent);

    expect(logSpy).toHaveBeenCalled();
  });

  it('returns snapshot data', () => {
    const actor = new PlayerActor({
      id: 'player-1',
      type: 'player',
      sessionId: 'session-1',
      locationId: 'loc-1',
    });

    const snapshot = actor.getSnapshot();

    expect(snapshot.id).toBe('player-1');
    expect(snapshot.type).toBe('player');
    expect(snapshot.sessionId).toBe('session-1');
    expect(snapshot.locationId).toBe('loc-1');
  });
});
