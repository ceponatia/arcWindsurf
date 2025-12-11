import { z } from 'zod';

/**
 * Schema for individual sensory detail
 */
export const SensoryDetailSchema = z.object({
  source: z.string(),
  bodyPart: z.string().optional(),
  description: z.string(),
  intensity: z.number().min(0).max(1),
  triggeredByAction: z.string().optional(),
});

/**
 * Schema for sensory context provided to NPC agents
 * This is structured data, not prose - NPCs will weave details into their narrative
 */
export const SensoryContextForNpcSchema = z.object({
  available: z.object({
    smell: z.array(SensoryDetailSchema).optional(),
    touch: z.array(SensoryDetailSchema).optional(),
    taste: z.array(SensoryDetailSchema).optional(),
    sound: z.array(SensoryDetailSchema).optional(),
    sight: z.array(SensoryDetailSchema).optional(),
  }),
  playerFocus: z
    .object({
      sense: z.enum(['smell', 'touch', 'taste', 'sound', 'sight']),
      target: z.string().optional(),
      bodyPart: z.string().optional(),
    })
    .optional(),
  narrativeHints: z.object({
    playerIsSniffing: z.boolean(),
    playerIsTouching: z.boolean(),
    playerIsTasting: z.boolean(),
    recentSensoryAction: z.boolean(),
  }),
});

export type SensoryDetail = z.infer<typeof SensoryDetailSchema>;
export type SensoryContextForNpc = z.infer<typeof SensoryContextForNpcSchema>;
