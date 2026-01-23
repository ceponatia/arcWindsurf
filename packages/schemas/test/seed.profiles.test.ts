import { describe, test, expect } from 'vitest';
import { CharacterProfileSchema } from '../src/character/index.js';
import { SettingProfileSchema } from '../src/setting/index.js';
import { LocationMapSchema } from '../src/location/index.js';

describe('seed profiles schema compatibility', () => {
  test('setting seed JSON matches SettingProfileSchema', () => {
    const setting = {
      id: 'test-setting-001',
      name: 'Lanse Creuse High',
      lore: 'A sprawling suburban high school in the Midwest, built in the late 1970s with recent renovations. It houses over 2,000 students and features a mix of aging classrooms and modern computer labs. The atmosphere is a blend of academic pressure, teenage social dynamics, and the smell of floor wax and cafeteria food.',
      themes: ['coming of age', 'high school drama', 'suburban life'],
      tags: ['modern', 'school', 'realistic'],
    };

    expect(() => SettingProfileSchema.parse(setting)).not.toThrow();
  });

  test('character seed JSON matches CharacterProfileSchema', () => {
    const character = {
      id: 'test-character-001',
      name: 'Alex Chen',
      age: 17,
      gender: 'male',
      race: 'Human',
      summary: 'A high-achieving senior feeling the pressure of college applications.',
      backstory:
        "Alex has always been at the top of his class. With college applications due and the debate team finals approaching, he's starting to crack under the pressure. He spends most of his time in the library or the computer lab.",
      tags: ['student', 'senior', 'academic'],
      tier: 'major',
      personality: ['ambitious', 'anxious', 'intelligent'],
      personalityMap: {
        dimensions: {
          openness: 0.7,
          conscientiousness: 0.9,
          extraversion: 0.4,
          agreeableness: 0.6,
          neuroticism: 0.8,
        },
        traits: ['perfectionist', 'studious', 'worrier'],
        values: [
          { value: 'success', priority: 1 },
          { value: 'competence', priority: 2 },
        ],
        speech: {
          vocabulary: 'educated',
          sentenceStructure: 'complex',
          formality: 'neutral',
          humor: 'rare',
          expressiveness: 'reserved',
          directness: 'indirect',
          pace: 'quick',
        },
      },
      physique: {
        build: {
          height: 'average',
          torso: 'lithe',
          skinTone: 'fair',
          arms: { build: 'slender', length: 'average' },
          legs: { length: 'average', build: 'slender' },
          feet: { size: 'small', shape: 'average' },
        },
        appearance: {
          hair: { color: 'black', style: 'short, neat', length: 'short' },
          eyes: { color: 'dark brown' },
          features: ['glasses'],
        },
      },
      body: {
        hands: {
          visual: { description: 'Ink-stained fingers, bitten nails' },
          texture: { primary: 'Smooth but clammy' },
          scent: { primary: 'Paper and graphite' },
        },
        hair: {
          scent: { primary: 'Generic shampoo' },
        },
      },
      details: [
        {
          label: 'Class Rank',
          area: 'history',
          value: 'Currently ranked #2, fighting for Valedictorian.',
          importance: 0.9,
          tags: ['school', 'academic'],
        },
        {
          label: 'Backpack',
          area: 'custom',
          value: 'Heavy, filled with textbooks, a laptop, and energy bars.',
          importance: 0.6,
          tags: ['inventory'],
        },
      ],
    };

    expect(() => CharacterProfileSchema.parse(character)).not.toThrow();
  });

  test('location map seed JSON matches LocationMapSchema', () => {
    const map = {
      id: '00000000-0000-0000-0000-000000000029',
      name: 'Lanse Creuse High - Starter Map',
      description: 'A small starter location map for the seeded test setting.',
      settingId: 'test-setting-001',
      isTemplate: true,
      defaultStartLocationId: 'test-loc-hallway-001',
      tags: ['test', 'school', 'modern'],
      nodes: [
        {
          id: 'test-loc-campus-001',
          name: 'Lanse Creuse High Campus',
          type: 'region',
          parentId: null,
          depth: 0,
          summary: 'A sprawling suburban campus of aging halls and newer labs.',
          ports: [{ id: 'test-loc-campus-001-default', name: 'Default' }],
          position: { x: 0.2, y: 0.2 },
          tags: ['school', 'campus'],
        },
        {
          id: 'test-loc-main-building-001',
          name: 'Main Building',
          type: 'building',
          parentId: 'test-loc-campus-001',
          depth: 1,
          summary: 'The central hub: classrooms, admin offices, and the busiest hallways.',
          ports: [{ id: 'test-loc-main-building-001-default', name: 'Default' }],
          position: { x: 0.55, y: 0.22 },
          tags: ['school', 'building'],
        },
        {
          id: 'test-loc-hallway-001',
          name: 'Main Hallway',
          type: 'room',
          parentId: 'test-loc-main-building-001',
          depth: 2,
          summary: 'A long corridor with lockers, scuffed tiles, and constant foot traffic.',
          description:
            'Lockers line both sides, the fluorescent lights hum, and the scent of floor wax never quite goes away.',
          ports: [{ id: 'test-loc-hallway-001-default', name: 'Default' }],
          position: { x: 0.55, y: 0.5 },
          tags: ['school', 'hallway'],
        },
        {
          id: 'test-loc-library-001',
          name: 'Library',
          type: 'room',
          parentId: 'test-loc-main-building-001',
          depth: 2,
          summary: 'Quiet rows of shelves and study tables under soft, warm lighting.',
          ports: [{ id: 'test-loc-library-001-default', name: 'Default' }],
          position: { x: 0.28, y: 0.72 },
          tags: ['school', 'library'],
        },
        {
          id: 'test-loc-computer-lab-001',
          name: 'Computer Lab',
          type: 'room',
          parentId: 'test-loc-main-building-001',
          depth: 2,
          summary: 'A modern room of humming PCs, blue light, and click-clack keyboards.',
          ports: [{ id: 'test-loc-computer-lab-001-default', name: 'Default' }],
          position: { x: 0.78, y: 0.72 },
          tags: ['school', 'lab'],
        },
        {
          id: 'test-loc-cafeteria-001',
          name: 'Cafeteria',
          type: 'room',
          parentId: 'test-loc-main-building-001',
          depth: 2,
          summary: 'Long tables, echoing chatter, and the familiar smell of cafeteria food.',
          ports: [{ id: 'test-loc-cafeteria-001-default', name: 'Default' }],
          position: { x: 0.55, y: 0.86 },
          tags: ['school', 'cafeteria'],
        },
      ],
      connections: [
        {
          id: 'test-conn-hallway-library',
          fromLocationId: 'test-loc-hallway-001',
          fromPortId: 'test-loc-hallway-001-default',
          toLocationId: 'test-loc-library-001',
          toPortId: 'test-loc-library-001-default',
          bidirectional: true,
          travelMinutes: 1,
          locked: false,
          label: 'To Library',
        },
        {
          id: 'test-conn-hallway-computer-lab',
          fromLocationId: 'test-loc-hallway-001',
          fromPortId: 'test-loc-hallway-001-default',
          toLocationId: 'test-loc-computer-lab-001',
          toPortId: 'test-loc-computer-lab-001-default',
          bidirectional: true,
          travelMinutes: 1,
          locked: false,
          label: 'To Lab',
        },
        {
          id: 'test-conn-hallway-cafeteria',
          fromLocationId: 'test-loc-hallway-001',
          fromPortId: 'test-loc-hallway-001-default',
          toLocationId: 'test-loc-cafeteria-001',
          toPortId: 'test-loc-cafeteria-001-default',
          bidirectional: true,
          travelMinutes: 2,
          locked: false,
          label: 'To Cafeteria',
        },
      ],
    };

    expect(() => LocationMapSchema.parse(map)).not.toThrow();
  });
});
