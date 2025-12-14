/**
 * NPC Awareness Schemas
 *
 * Tracks how NPCs perceive and react to the player's presence.
 * Enables dynamic encounter reactions based on engagement and affinity.
 *
 * @see dev-docs/32-npc-encounters-and-occupancy.md Section 4
 */
import { z } from 'zod';

// =============================================================================
// Awareness Level
// =============================================================================

/**
 * How aware an NPC is of the player's presence.
 * - unaware: Too focused on their activity to notice
 * - peripheral: Might notice movement in their peripheral vision
 * - noticed: Has seen/heard the player enter
 * - focused: Actively paying attention to the player
 */
export const AwarenessLevelSchema = z.enum(['unaware', 'peripheral', 'noticed', 'focused']);
export type AwarenessLevel = z.infer<typeof AwarenessLevelSchema>;

// =============================================================================
// Reaction Type
// =============================================================================

/**
 * Initial reaction when an NPC notices the player.
 * - neutral: No strong reaction
 * - pleased: Happy to see the player
 * - wary: Cautious or suspicious
 * - surprised: Unexpected encounter
 * - hostile: Aggressive or threatening
 */
export const ReactionTypeSchema = z.enum(['neutral', 'pleased', 'wary', 'surprised', 'hostile']);
export type ReactionType = z.infer<typeof ReactionTypeSchema>;

// =============================================================================
// Initiative Type
// =============================================================================

/**
 * What the NPC will do after noticing the player.
 * - approach: Will walk over to engage the player
 * - acknowledge: Will greet or nod but stay put
 * - ignore: Will not engage unless the player initiates
 * - avoid: Will actively try to stay away from the player
 */
export const InitiativeTypeSchema = z.enum(['approach', 'acknowledge', 'ignore', 'avoid']);
export type InitiativeType = z.infer<typeof InitiativeTypeSchema>;

// =============================================================================
// NPC Awareness State
// =============================================================================

/**
 * Complete awareness state for an NPC regarding the player.
 */
export const NpcAwarenessSchema = z.object({
  /** NPC identifier */
  npcId: z.string().min(1),

  /** Whether the NPC has noticed the player */
  awarenessLevel: AwarenessLevelSchema,

  /** How the NPC reacted upon noticing (if they noticed) */
  reaction: ReactionTypeSchema.optional(),

  /** Whether NPC will approach or wait */
  initiative: InitiativeTypeSchema,
});
export type NpcAwareness = z.infer<typeof NpcAwarenessSchema>;

// =============================================================================
// Affinity Scores (input for awareness calculation)
// =============================================================================

/**
 * Affinity scores used to determine NPC reactions.
 * These come from the relationship/affinity system.
 */
export const AffinityScoresSchema = z.object({
  /** How much the NPC likes/dislikes the player (-100 to 100) */
  fondness: z.number().min(-100).max(100),

  /** How attracted the NPC is to the player (0 to 100) */
  attraction: z.number().min(0).max(100),

  /** How much the NPC fears the player (0 to 100) */
  fear: z.number().min(0).max(100),

  /** How much the NPC trusts the player (-100 to 100) */
  trust: z.number().min(-100).max(100).optional(),

  /** How much the NPC respects the player (-100 to 100) */
  respect: z.number().min(-100).max(100).optional(),
});
export type AffinityScores = z.infer<typeof AffinityScoresSchema>;

// =============================================================================
// Awareness Calculation
// =============================================================================

/**
 * Input for awareness determination.
 */
export interface AwarenessInput {
  /** NPC's current engagement level */
  engagement: 'idle' | 'casual' | 'focused' | 'absorbed';

  /** Affinity scores for this NPC-player pair */
  affinity: AffinityScores;
}

/**
 * Determine how an NPC reacts when player enters their location.
 */
export function determineAwareness(input: AwarenessInput): NpcAwareness {
  const { engagement, affinity } = input;

  // Base awareness on NPC's engagement level
  let awarenessLevel: AwarenessLevel;
  switch (engagement) {
    case 'absorbed':
      awarenessLevel = 'unaware'; // Too focused to notice
      break;
    case 'focused':
      awarenessLevel = 'peripheral'; // Might notice movement
      break;
    case 'casual':
    case 'idle':
    default:
      awarenessLevel = 'noticed'; // Will see player enter
      break;
  }

  // High affinity NPCs notice player more readily
  if (affinity.fondness > 50 || affinity.attraction > 50) {
    awarenessLevel = 'focused';
  }

  // Determine reaction based on affinity
  let reaction: ReactionType = 'neutral';
  if (affinity.fondness > 30) reaction = 'pleased';
  if (affinity.fondness < -30) reaction = 'wary';
  if (affinity.fear > 50) reaction = 'hostile';

  // Determine initiative
  let initiative: InitiativeType = 'acknowledge';
  if (affinity.fondness > 60) initiative = 'approach';
  if (affinity.fondness < -20 || affinity.fear > 30) initiative = 'avoid';
  if (awarenessLevel === 'unaware') initiative = 'ignore';

  return {
    npcId: '', // Caller should set this
    awarenessLevel,
    reaction: awarenessLevel !== 'unaware' ? reaction : undefined,
    initiative,
  };
}

// =============================================================================
// Default Factory
// =============================================================================

/**
 * Create a default awareness state (neutral, noticed).
 */
export function createDefaultAwareness(npcId: string): NpcAwareness {
  return {
    npcId,
    awarenessLevel: 'noticed',
    reaction: 'neutral',
    initiative: 'acknowledge',
  };
}
