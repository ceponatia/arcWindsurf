import { z } from 'zod';

/**
 * Request schema for creating a full session.
 */
export const CreateFullSessionRequestSchema = z.object({
  /** Required: Setting to use for this session */
  settingId: z.string().min(1),

  /** Optional: Persona ID for the player character */
  personaId: z.string().optional(),

  /** Optional: Starting location ID */
  startLocationId: z.string().optional(),

  /** Optional: Starting time configuration */
  startTime: z
    .object({
      year: z.number().optional(),
      month: z.number().min(1).max(12).optional(),
      day: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
    })
    .optional(),

  /** Optional: Seconds per turn (defaults to setting value or 60) */
  secondsPerTurn: z.number().min(1).optional(),

  /** Required: NPCs to include in the session */
  npcs: z
    .array(
      z.object({
        /** Character template ID */
        characterId: z.string().min(1),
        /** Role in the session */
        role: z.enum(['primary', 'supporting', 'background', 'antagonist']).default('supporting'),
        /** NPC tier for detail level */
        tier: z.enum(['major', 'minor', 'transient']).default('minor'),
        /** Optional starting location for this NPC */
        startLocationId: z.string().optional(),
        /** Optional label for identifying this NPC instance */
        label: z.string().optional(),
      })
    )
    .min(1, 'at least one npc is required'),

  /** Optional: Initial relationships between entities */
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

  /** Optional: Tags to attach to the session */
  tags: z
    .array(
      z.union([
        // Legacy (v1) payload
        z.object({
          tagId: z.string().min(1),
          scope: z.enum(['session', 'npc']),
          /** Optional: NPC character template ID (resolved to instance ID) */
          targetId: z.string().optional(),
        }),
        // New (v2) payload
        z.object({
          tagId: z.string().min(1),
          targetType: z.enum(['session', 'character', 'npc', 'player', 'location', 'setting']),
          targetEntityId: z.string().nullable().optional(),
        }),
      ])
    )
    .optional(),
});

export type CreateFullSessionRequest = z.infer<typeof CreateFullSessionRequestSchema>;

/**
 * Response type for full session creation.
 */
export interface CreateFullSessionResponse {
  id: string;
  settingId: string;
  playerCharacterId: string;
  personaId: string | null;
  startLocationId: string | null;
  secondsPerTurn: number;
  createdAt: string;
  npcs: {
    instanceId: string;
    templateId: string;
    role: string;
    tier: string;
    label: string | null;
    startLocationId: string | null;
  }[];
  tagBindings: {
    id: string;
    tagId: string;
    targetType: string;
    targetEntityId: string | null;
  }[];
  relationships: {
    fromActorId: string;
    toActorId: string;
    relationshipType: string;
  }[];
}
