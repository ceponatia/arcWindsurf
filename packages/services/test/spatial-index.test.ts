import { describe, it, expect } from 'vitest';
import { SpatialIndex } from '../src/physics/spatial-index.js';
import { makeEngagementKey } from '@minimal-rpg/schemas';

const state = SpatialIndex.createDefault();

describe('SpatialIndex', () => {
  it('engages and intensifies engagements', () => {
    const engage = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'casual',
      currentTick: 1,
    });
    expect(engage.success).toBe(true);

    const intensify = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'intensify',
      newIntensity: 'focused',
      currentTick: 2,
    });
    expect(intensify.success).toBe(true);
  });

  it('reduces and ends engagements', () => {
    const reduce = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'reduce',
      newIntensity: 'casual',
      currentTick: 3,
    });
    expect(reduce.success).toBe(true);

    const end = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'end',
      currentTick: 4,
    });
    expect(end.success).toBe(true);
  });

  it('returns errors on invalid operations', () => {
    const missing = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-x',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'reduce',
      newIntensity: 'casual',
      currentTick: 1,
    });
    expect(missing.success).toBe(false);

    const missingIntensity = SpatialIndex.updateEngagement(state, {
      npcId: 'npc-1',
      bodyPart: 'hand',
      senseType: 'touch',
      action: 'engage',
      currentTick: 2,
    });
    expect(missingIntensity.success).toBe(false);
  });

  it('touches engagements and ends all for npc', () => {
    SpatialIndex.updateEngagement(state, {
      npcId: 'npc-2',
      bodyPart: 'arm',
      senseType: 'touch',
      action: 'engage',
      newIntensity: 'focused',
      currentTick: 1,
    });

    const key = makeEngagementKey('npc-2', 'arm', 'touch');
    const touched = SpatialIndex.touchEngagement(state, key, 5);
    expect(touched.success).toBe(true);

    const ended = SpatialIndex.endAllEngagementsForNpc(state, 'npc-2');
    expect(ended.success).toBe(true);
  });
});
