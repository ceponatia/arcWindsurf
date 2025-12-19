import {
  generateEncounterNarration,
  generateNpcEntranceNarration,
  generateNpcExitNarration,
  type EncounterNarrationOptions,
  type EncounterNpcInfo,
} from '../../src/sessions/encounter-service.js';

const baseActivity = {
  type: 'reading',
  description: 'Reading old tomes',
  engagement: 'focused' as const,
};

describe('generateEncounterNarration', () => {
  const cases: {
    name: string;
    options: EncounterNarrationOptions;
    expected: { scene: string; crowd: string | null; introCount: number; names: string[] };
  }[] = [
    {
      name: 'player entering with notable NPCs and crowd',
      options: {
        locationName: 'Arcane Library',
        locationDescription: 'Shelves of ancient tomes line the walls.',
        npcsPresent: [
          {
            npcId: 'npc-1',
            name: 'Seren',
            appearance: 'robed scholar',
            activity: { ...baseActivity, description: 'Resting between research' },
            tier: 'major',
          } satisfies EncounterNpcInfo,
          {
            npcId: 'npc-2',
            name: 'Onlookers',
            appearance: 'quiet patrons',
            activity: { type: 'waiting', description: 'Waiting in silence', engagement: 'idle' },
            tier: 'background',
          } satisfies EncounterNpcInfo,
        ],
        crowdLevel: 'moderate',
        timeOfDay: 'evening',
        playerEntering: true,
      },
      expected: {
        scene:
          'You enter Arcane Library. Shelves of ancient tomes line the walls. Evening shadows lengthen. There is a moderate crowd.',
        crowd: 'A quiet patrons is nearby.',
        introCount: 1,
        names: ['Seren'],
      },
    },
    {
      name: 'npc entrance scenario without background crowd',
      options: {
        locationName: 'Training Yard',
        npcsPresent: [
          {
            npcId: 'npc-3',
            name: 'Kael',
            appearance: 'armored fighter',
            activity: { type: 'working', description: 'Sharpening blades', engagement: 'casual' },
            tier: 'minor',
          } satisfies EncounterNpcInfo,
        ],
        crowdLevel: 'sparse',
        playerEntering: false,
      },
      expected: {
        scene: 'You are in Training Yard. A few people are scattered about.',
        crowd: null,
        introCount: 1,
        names: ['Kael'],
      },
    },
  ];

  for (const { name, options, expected } of cases) {
    it(name, () => {
      const result = generateEncounterNarration(options);

      expect(result.sceneDescription).toBe(expected.scene);
      expect(result.crowdDescription).toBe(expected.crowd);
      expect(result.npcIntroductions).toHaveLength(expected.introCount);
      for (const npcName of expected.names) {
        expect(result.fullNarration).toContain(npcName);
      }
      expect(result.fullNarration).toContain(result.sceneDescription);
      if (expected.crowd) {
        expect(result.fullNarration).toContain(expected.crowd);
      }
    });
  }
});

describe('generateNpcEntranceNarration', () => {
  const cases: {
    name: string;
    npc: EncounterNpcInfo;
    direction?: string;
    expectIncludes: string[];
  }[] = [
    {
      name: 'adds direction and activity context',
      npc: {
        npcId: 'npc-4',
        name: 'Lyra',
        appearance: 'cartographer',
        activity: { type: 'studying', description: 'Studying star charts', engagement: 'absorbed' },
        tier: 'major',
      },
      direction: 'east',
      expectIncludes: ['Lyra', 'from the east', 'deeply focused on studying star charts'],
    },
    {
      name: 'omits activity context when idle',
      npc: {
        npcId: 'npc-5',
        name: 'Idle NPC',
        appearance: 'villager',
        activity: { type: 'idle', description: 'Standing by', engagement: 'idle' },
        tier: 'background',
      },
      expectIncludes: ['Idle NPC'],
    },
  ];

  for (const { name, npc, direction, expectIncludes } of cases) {
    it(name, () => {
      const narration = generateNpcEntranceNarration(npc, direction);
      for (const token of expectIncludes) {
        expect(narration).toContain(token);
      }
    });
  }
});

describe('generateNpcExitNarration', () => {
  const cases: {
    name: string;
    npc: EncounterNpcInfo;
    direction?: string;
    expectedTokens: string[];
  }[] = [
    {
      name: 'includes exit direction when provided',
      npc: {
        npcId: 'npc-6',
        name: 'Mara',
        appearance: 'scout',
        activity: { type: 'traveling', description: 'Heading out', engagement: 'focused' },
        tier: 'minor',
      },
      direction: 'north',
      expectedTokens: ['Mara', 'toward the north'],
    },
    {
      name: 'uses fallback phrases without direction',
      npc: {
        npcId: 'npc-7',
        name: 'Orin',
        appearance: 'merchant',
        activity: baseActivity,
        tier: 'background',
      },
      expectedTokens: ['Orin'],
    },
  ];

  for (const { name, npc, direction, expectedTokens } of cases) {
    it(name, () => {
      const narration = generateNpcExitNarration(npc, direction);
      for (const token of expectedTokens) {
        expect(narration).toContain(token);
      }
    });
  }
});
