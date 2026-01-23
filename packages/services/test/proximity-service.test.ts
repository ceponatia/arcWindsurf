import { describe, it, expect } from 'vitest';
import { ProximityService } from '../src/physics/proximity-service.js';
import { makeEngagementKey } from '@minimal-rpg/schemas';

const service = new ProximityService();

describe('ProximityService', () => {
  it('creates default state and starts engagements', () => {
    const state = service.createDefaultState();

    const result = service.startEngagement(
      state,
      'npc-1',
      'hand',
      'touch',
      'focused',
      5
    );

    expect(result.success).toBe(true);
    expect(service.hasActiveEngagement(state, 'npc-1')).toBe(true);
  });

  it('filters engagements by intensity and recency', () => {
    const state = service.createDefaultState();
    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'casual', 1);
    service.startEngagement(state, 'npc-1', 'hand', 'smell', 'intimate', 10);

    const filtered = service.getFilteredEngagements(state, 'npc-1', {
      minIntensity: 'focused',
    });
    expect(filtered).toHaveLength(1);

    const recent = service.getFilteredEngagements(state, 'npc-1', {
      activeWithinTicks: 3,
      currentTick: 12,
    });
    expect(recent).toHaveLength(1);
  });

  it('tracks proximity levels and summary', () => {
    const state = service.createDefaultState();
    service.setNpcProximityLevel(state, 'npc-1', 'near');

    const info = service.getNpcProximityInfo(state, 'npc-1');
    expect(info.proximityLevel).toBe('near');

    const summary = service.getProximitySummary(state);
    expect(summary.npcsInProximity).toEqual([{ npcId: 'npc-1', level: 'near' }]);
  });

  it('cleans up stale engagements', () => {
    const state = service.createDefaultState();
    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'focused', 1);

    const { removed } = service.cleanupStaleEngagements(state, 20, 10);
    expect(removed).toBe(1);
  });

  it('touches and ends engagements', () => {
    const state = service.createDefaultState();
    service.startEngagement(state, 'npc-1', 'hand', 'touch', 'focused', 1);

    const key = makeEngagementKey('npc-1', 'hand', 'touch');
    const touch = service.touchEngagement(state, key, 3);
    expect(touch.success).toBe(true);

    const end = service.endEngagement(state, 'npc-1', 'hand', 'touch', 4);
    expect(end.success).toBe(true);
  });
});
