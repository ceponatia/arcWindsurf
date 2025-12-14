/**
 * Integration Tests for /sessions/create-full endpoint
 *
 * Phase 7.3: Testing & Validation
 * Tests the transactional session creation API's validation logic.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Request schema for creating a full session (mirrored from session-create-full.ts)
 * We test the schema directly to validate request structure without DB dependencies.
 */
const CreateFullSessionRequestSchema = z.object({
  settingId: z.string().min(1),
  personaId: z.string().optional(),
  startLocationId: z.string().optional(),
  startTime: z
    .object({
      year: z.number().optional(),
      month: z.number().min(1).max(12).optional(),
      day: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
    })
    .optional(),
  secondsPerTurn: z.number().min(1).optional(),
  npcs: z.array(
    z.object({
      characterId: z.string().min(1),
      role: z.enum(['primary', 'supporting', 'background', 'antagonist']).default('supporting'),
      tier: z.enum(['major', 'minor', 'transient']).default('minor'),
      startLocationId: z.string().optional(),
      label: z.string().optional(),
    })
  ),
  relationships: z
    .array(
      z.object({
        fromActorId: z.string().min(1),
        toActorId: z.string().min(1),
        relationshipType: z.string().default('stranger'),
        affinitySeed: z
          .object({
            trust: z.number().min(0).max(1).optional(),
            fondness: z.number().min(0).max(1).optional(),
            fear: z.number().min(0).max(1).optional(),
          })
          .optional(),
      })
    )
    .optional(),
  tags: z
    .array(
      z.object({
        tagId: z.string().min(1),
        scope: z.enum(['session', 'npc']),
        targetId: z.string().optional(),
      })
    )
    .optional(),
});

type CreateFullSessionRequest = z.infer<typeof CreateFullSessionRequestSchema>;

describe('CreateFullSessionRequest Schema', () => {
  describe('Required Fields', () => {
    it('should require settingId', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        npcs: [{ characterId: 'char-1' }],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.settingId).toBeDefined();
      }
    });

    it('should require non-empty settingId', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: '',
        npcs: [{ characterId: 'char-1' }],
      });
      expect(result.success).toBe(false);
    });

    it('should require npcs array', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.npcs).toBeDefined();
      }
    });

    it('should allow empty npcs array', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Minimal Valid Request', () => {
    it('should accept minimal valid request', () => {
      const request = {
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
      };

      const result = CreateFullSessionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.settingId).toBe('setting-1');
        expect(result.data.npcs).toHaveLength(1);
        expect(result.data.npcs[0].characterId).toBe('char-1');
        // Defaults applied
        expect(result.data.npcs[0].role).toBe('supporting');
        expect(result.data.npcs[0].tier).toBe('minor');
      }
    });
  });

  describe('NPC Configuration', () => {
    it('should validate NPC roles', () => {
      const validRoles = ['primary', 'supporting', 'background', 'antagonist'];
      for (const role of validRoles) {
        const result = CreateFullSessionRequestSchema.safeParse({
          settingId: 'setting-1',
          npcs: [{ characterId: 'char-1', role }],
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid NPC role', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1', role: 'invalid' }],
      });
      expect(result.success).toBe(false);
    });

    it('should validate NPC tiers', () => {
      const validTiers = ['major', 'minor', 'transient'];
      for (const tier of validTiers) {
        const result = CreateFullSessionRequestSchema.safeParse({
          settingId: 'setting-1',
          npcs: [{ characterId: 'char-1', tier }],
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid NPC tier', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1', tier: 'invalid' }],
      });
      expect(result.success).toBe(false);
    });

    it('should require characterId for each NPC', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ role: 'primary' }],
      });
      expect(result.success).toBe(false);
    });

    it('should accept multiple NPCs', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [
          { characterId: 'char-1', role: 'primary', tier: 'major' },
          { characterId: 'char-2', role: 'supporting', tier: 'minor' },
          { characterId: 'char-3', role: 'background', tier: 'transient' },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.npcs).toHaveLength(3);
      }
    });

    it('should accept NPC with startLocationId and label', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [
          {
            characterId: 'char-1',
            role: 'primary',
            tier: 'major',
            startLocationId: 'loc-1',
            label: 'The Bartender',
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.npcs[0].startLocationId).toBe('loc-1');
        expect(result.data.npcs[0].label).toBe('The Bartender');
      }
    });
  });

  describe('Time Configuration', () => {
    it('should accept valid startTime', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        startTime: { hour: 14, minute: 30 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startTime?.hour).toBe(14);
        expect(result.data.startTime?.minute).toBe(30);
      }
    });

    it('should accept full startTime with year/month/day', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        startTime: { year: 1200, month: 6, day: 15, hour: 9, minute: 0 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startTime?.year).toBe(1200);
        expect(result.data.startTime?.month).toBe(6);
        expect(result.data.startTime?.day).toBe(15);
      }
    });

    it('should require hour and minute in startTime', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        startTime: { year: 1200 },
      });
      expect(result.success).toBe(false);
    });

    it('should validate hour range (0-23)', () => {
      const invalidHours = [-1, 24, 25];
      for (const hour of invalidHours) {
        const result = CreateFullSessionRequestSchema.safeParse({
          settingId: 'setting-1',
          npcs: [{ characterId: 'char-1' }],
          startTime: { hour, minute: 0 },
        });
        expect(result.success).toBe(false);
      }
    });

    it('should validate minute range (0-59)', () => {
      const invalidMinutes = [-1, 60, 100];
      for (const minute of invalidMinutes) {
        const result = CreateFullSessionRequestSchema.safeParse({
          settingId: 'setting-1',
          npcs: [{ characterId: 'char-1' }],
          startTime: { hour: 12, minute },
        });
        expect(result.success).toBe(false);
      }
    });

    it('should validate month range (1-12)', () => {
      const result1 = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        startTime: { hour: 12, minute: 0, month: 0 },
      });
      expect(result1.success).toBe(false);

      const result2 = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        startTime: { hour: 12, minute: 0, month: 13 },
      });
      expect(result2.success).toBe(false);
    });

    it('should validate day range (1-31)', () => {
      const result1 = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        startTime: { hour: 12, minute: 0, day: 0 },
      });
      expect(result1.success).toBe(false);

      const result2 = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        startTime: { hour: 12, minute: 0, day: 32 },
      });
      expect(result2.success).toBe(false);
    });

    it('should accept secondsPerTurn', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        secondsPerTurn: 120,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.secondsPerTurn).toBe(120);
      }
    });

    it('should reject secondsPerTurn less than 1', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        secondsPerTurn: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Relationships Configuration', () => {
    it('should accept valid relationships', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        relationships: [
          {
            fromActorId: 'player',
            toActorId: 'char-1',
            relationshipType: 'friend',
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.relationships).toHaveLength(1);
        expect(result.data.relationships![0].relationshipType).toBe('friend');
      }
    });

    it('should apply default relationshipType', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        relationships: [
          {
            fromActorId: 'player',
            toActorId: 'char-1',
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.relationships![0].relationshipType).toBe('stranger');
      }
    });

    it('should accept affinitySeed', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        relationships: [
          {
            fromActorId: 'player',
            toActorId: 'char-1',
            relationshipType: 'friend',
            affinitySeed: {
              trust: 0.8,
              fondness: 0.7,
              fear: 0.1,
            },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.relationships![0].affinitySeed?.trust).toBe(0.8);
        expect(result.data.relationships![0].affinitySeed?.fondness).toBe(0.7);
        expect(result.data.relationships![0].affinitySeed?.fear).toBe(0.1);
      }
    });

    it('should validate affinity values are between 0 and 1', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        relationships: [
          {
            fromActorId: 'player',
            toActorId: 'char-1',
            affinitySeed: { trust: 1.5 },
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative affinity values', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        relationships: [
          {
            fromActorId: 'player',
            toActorId: 'char-1',
            affinitySeed: { fondness: -0.5 },
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should require fromActorId and toActorId', () => {
      const result1 = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        relationships: [{ toActorId: 'char-1' }],
      });
      expect(result1.success).toBe(false);

      const result2 = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        relationships: [{ fromActorId: 'player' }],
      });
      expect(result2.success).toBe(false);
    });
  });

  describe('Tags Configuration', () => {
    it('should accept session-scoped tags', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        tags: [{ tagId: 'tag-1', scope: 'session' }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toHaveLength(1);
        expect(result.data.tags![0].scope).toBe('session');
      }
    });

    it('should accept npc-scoped tags with targetId', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        tags: [{ tagId: 'tag-1', scope: 'npc', targetId: 'char-1' }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags![0].scope).toBe('npc');
        expect(result.data.tags![0].targetId).toBe('char-1');
      }
    });

    it('should reject invalid tag scope', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        tags: [{ tagId: 'tag-1', scope: 'invalid' }],
      });
      expect(result.success).toBe(false);
    });

    it('should require tagId', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        tags: [{ scope: 'session' }],
      });
      expect(result.success).toBe(false);
    });

    it('should accept multiple tags', () => {
      const result = CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-1',
        npcs: [{ characterId: 'char-1' }],
        tags: [
          { tagId: 'tag-1', scope: 'session' },
          { tagId: 'tag-2', scope: 'session' },
          { tagId: 'tag-3', scope: 'npc', targetId: 'char-1' },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toHaveLength(3);
      }
    });
  });

  describe('Full Request Validation', () => {
    it('should accept complete valid request', () => {
      const request: CreateFullSessionRequest = {
        settingId: 'fantasy-tavern',
        personaId: 'persona-1',
        startLocationId: 'tavern-main-hall',
        startTime: {
          year: 1200,
          month: 6,
          day: 15,
          hour: 20,
          minute: 30,
        },
        secondsPerTurn: 60,
        npcs: [
          {
            characterId: 'bartender',
            role: 'primary',
            tier: 'major',
            startLocationId: 'tavern-bar',
            label: 'Grim the Bartender',
          },
          {
            characterId: 'bard',
            role: 'supporting',
            tier: 'minor',
            startLocationId: 'tavern-stage',
          },
          {
            characterId: 'patron',
            role: 'background',
            tier: 'transient',
          },
        ],
        relationships: [
          {
            fromActorId: 'player',
            toActorId: 'bartender',
            relationshipType: 'acquaintance',
            affinitySeed: { trust: 0.6, fondness: 0.5 },
          },
          {
            fromActorId: 'bartender',
            toActorId: 'bard',
            relationshipType: 'friend',
            affinitySeed: { trust: 0.8, fondness: 0.9 },
          },
        ],
        tags: [
          { tagId: 'busy-night', scope: 'session' },
          { tagId: 'talkative', scope: 'npc', targetId: 'bartender' },
        ],
      };

      const result = CreateFullSessionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.settingId).toBe('fantasy-tavern');
        expect(result.data.personaId).toBe('persona-1');
        expect(result.data.npcs).toHaveLength(3);
        expect(result.data.relationships).toHaveLength(2);
        expect(result.data.tags).toHaveLength(2);
      }
    });
  });
});

describe('Session Creation Business Logic', () => {
  describe('NPC Instance ID Generation', () => {
    it('should generate unique instance IDs from template IDs', () => {
      const generateInstanceId = (templateId: string): string => {
        return `${templateId}-${crypto.randomUUID()}`;
      };

      const id1 = generateInstanceId('char-1');
      const id2 = generateInstanceId('char-1');

      expect(id1).toContain('char-1-');
      expect(id2).toContain('char-1-');
      expect(id1).not.toBe(id2);
    });
  });

  describe('Primary NPC Selection', () => {
    it('should select first NPC with primary role', () => {
      const npcs = [
        { characterId: 'char-1', role: 'supporting' },
        { characterId: 'char-2', role: 'primary' },
        { characterId: 'char-3', role: 'primary' },
      ];

      const primaryNpc = npcs.find((n) => n.role === 'primary') ?? npcs[0];
      expect(primaryNpc.characterId).toBe('char-2');
    });

    it('should fallback to first NPC if no primary', () => {
      const npcs = [
        { characterId: 'char-1', role: 'supporting' },
        { characterId: 'char-2', role: 'background' },
      ];

      const primaryNpc = npcs.find((n) => n.role === 'primary') ?? npcs[0];
      expect(primaryNpc.characterId).toBe('char-1');
    });
  });

  describe('Default Affinity Values', () => {
    it('should apply default affinity values', () => {
      const affinitySeed = { trust: 0.7 };
      const defaultAffinity = {
        trust: affinitySeed.trust ?? 0.5,
        fondness: (affinitySeed as { fondness?: number }).fondness ?? 0.5,
        fear: (affinitySeed as { fear?: number }).fear ?? 0.0,
      };

      expect(defaultAffinity.trust).toBe(0.7);
      expect(defaultAffinity.fondness).toBe(0.5);
      expect(defaultAffinity.fear).toBe(0.0);
    });
  });

  describe('Tag Binding Logic', () => {
    it('should resolve NPC instance ID for npc-scoped tags', () => {
      const npcInstances = [
        { id: 'char-1-uuid-1', characterId: 'char-1' },
        { id: 'char-2-uuid-2', characterId: 'char-2' },
      ];

      const tag = { tagId: 'tag-1', scope: 'npc' as const, targetId: 'char-1' };

      const npcInstance = npcInstances.find((n) => n.characterId === tag.targetId);
      const targetEntityId = npcInstance?.id ?? tag.targetId;

      expect(targetEntityId).toBe('char-1-uuid-1');
    });

    it('should use targetId directly if no matching NPC instance', () => {
      const npcInstances = [{ id: 'char-1-uuid-1', characterId: 'char-1' }];

      const tag = { tagId: 'tag-1', scope: 'npc' as const, targetId: 'char-unknown' };

      const npcInstance = npcInstances.find((n) => n.characterId === tag.targetId);
      const targetEntityId = npcInstance?.id ?? tag.targetId;

      expect(targetEntityId).toBe('char-unknown');
    });
  });
});
