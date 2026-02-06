import { describe, expect, it } from 'vitest';
import {
  generateEncounterNarration,
  generateNpcEntranceNarration,
  generateNpcExitNarration,
} from '../../src/services/encounter-service.js';
import type { EncounterNpcInfo } from '@minimal-rpg/schemas';

const baseNpc: EncounterNpcInfo = {
  npcId: 'npc-1',
  name: 'Ava',
  tier: 'major',
  activity: { type: 'idle', description: 'Resting', engagement: 'idle' },
};

const backgroundNpc: EncounterNpcInfo = {
  npcId: 'npc-2',
  name: 'Bryn',
  tier: 'background',
  activity: { type: 'idle', description: 'Resting', engagement: 'idle' },
  appearance: 'traveler',
};

describe('services/encounter-service', () => {
  it('builds narration with scene, crowd, and introductions', () => {
    const narration = generateEncounterNarration({
      locationName: 'Market Square',
      locationDescription: 'Stalls line the street.',
      npcsPresent: [baseNpc, backgroundNpc],
      crowdLevel: 'moderate',
      timeOfDay: 'morning',
      playerEntering: true,
    });

    expect(narration.sceneDescription).toContain('You enter Market Square.');
    expect(narration.sceneDescription).toContain('Morning activity fills the air.');
    expect(narration.sceneDescription).toContain('There is a moderate crowd.');
    expect(narration.npcIntroductions).toHaveLength(1);
    expect(narration.crowdDescription).toContain('traveler');
    expect(narration.fullNarration).toContain(narration.sceneDescription);
  });

  it('generates deterministic entrance and exit narration', () => {
    const activeNpc: EncounterNpcInfo = {
      npcId: 'npc-3',
      name: 'Cora',
      tier: 'minor',
      activity: { type: 'talk', description: 'Talking softly', engagement: 'casual' },
    };

    const first = generateNpcEntranceNarration(activeNpc, 'east');
    const second = generateNpcEntranceNarration(activeNpc, 'east');

    expect(first).toBe(second);
    expect(first).toContain('from the east');
    expect(first.toLowerCase()).toContain('casually talking softly');

    const exit = generateNpcExitNarration(activeNpc, 'west');
    expect(exit).toContain('toward the west');
  });
});
