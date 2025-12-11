import { z } from 'zod';

/**
 * Configuration for NPC agent response generation
 */
export const NpcResponseConfigSchema = z.object({
  /** Minimum number of sentences per completed action */
  minSentencesPerAction: z.number().int().positive().default(2),

  /** Maximum number of sentences per completed action */
  maxSentencesPerAction: z.number().int().positive().default(3),

  /** Minimum number of sensory details to include (when available) */
  minSensoryDetailsPerAction: z.number().int().nonnegative().default(1),

  /** Whether to enforce temporal ordering in narrative */
  enforceTemporalOrdering: z.boolean().default(true),

  /** Whether to show pending actions in prompt */
  showPendingActions: z.boolean().default(true),
});

export type NpcResponseConfig = z.infer<typeof NpcResponseConfigSchema>;

/**
 * Default configuration for NPC responses
 */
export const DEFAULT_NPC_RESPONSE_CONFIG: NpcResponseConfig = {
  minSentencesPerAction: 2,
  maxSentencesPerAction: 3,
  minSensoryDetailsPerAction: 1,
  enforceTemporalOrdering: true,
  showPendingActions: true,
};
