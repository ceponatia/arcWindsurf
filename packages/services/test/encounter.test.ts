import { describe, it, expect } from 'vitest';
import {
  generateEncounterNarration,
  generateNpcEntranceNarration,
  generateNpcExitNarration,
} from '../src/simulation/encounter.js';

const npc = {
  npcId: 'npc-1',
  name: 'Aria',
  activity: { type: 'working', description: 'Wiping tables', engagement: 'focused' },
  tier: 'minor',
} as const;

describe('Encounter narration', () => {
  it('generates combined narration', () => {
    const result = generateEncounterNarration({
      locationName: 'Tavern',
      locationDescription: 'Warm and busy',
      npcsPresent: [npc],
      crowdLevel: 'moderate',
      timeOfDay: 'evening',
      playerEntering: true,
    });

    expect(result.sceneDescription).toContain('Tavern');
    expect(result.npcIntroductions[0]?.npcId).toBe('npc-1');
    expect(result.fullNarration).toContain('Aria');
  });

  it('generates entrance and exit narration', () => {
    const entrance = generateNpcEntranceNarration(npc, 'north');
    const exit = generateNpcExitNarration(npc, 'south');

    expect(entrance).toContain('Aria');
    expect(entrance).toContain('north');
    expect(exit).toContain('Aria');
    expect(exit).toContain('south');
  });
});
