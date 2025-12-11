/**
 * Proximity State Schema
 *
 * Tracks ongoing physical/sensory relationships between player and NPCs across turns.
 * Enables continuous sensory details, context-aware NPC reactions, and natural disengagement.
 */
import { z } from 'zod';

// =============================================================================
// Sensory Engagement Schema
// =============================================================================

/**
 * The type of sense being engaged.
 */
export const SenseTypeSchema = z.enum(['look', 'touch', 'smell', 'taste', 'hear']);
export type SenseType = z.infer<typeof SenseTypeSchema>;

/**
 * Intensity level of a sensory engagement.
 * - casual: Brief or passing attention
 * - focused: Deliberate, sustained attention
 * - intimate: Close, personal contact
 */
export const EngagementIntensitySchema = z.enum(['casual', 'focused', 'intimate']);
export type EngagementIntensity = z.infer<typeof EngagementIntensitySchema>;

/**
 * A single sensory engagement between player and an NPC body part.
 * Keyed by `${npcId}:${bodyPart}:${senseType}` in the engagements record.
 */
export const SensoryEngagementSchema = z.object({
  /** NPC identifier */
  npcId: z.string(),

  /** Body part being engaged (e.g., 'hair', 'feet', 'hands') */
  bodyPart: z.string(),

  /** Type of sense engaged */
  senseType: SenseTypeSchema,

  /** Current intensity level */
  intensity: EngagementIntensitySchema,

  /** Turn number or timestamp when engagement started */
  startedAt: z.number(),

  /** Turn number or timestamp of last activity */
  lastActiveAt: z.number(),
});
export type SensoryEngagement = z.infer<typeof SensoryEngagementSchema>;

// =============================================================================
// NPC Proximity Level Schema
// =============================================================================

/**
 * General proximity level to an NPC.
 * - distant: Across the room, no physical interaction possible
 * - near: Within arm's reach, social distance
 * - close: Personal space, intimate conversation distance
 * - intimate: Physical contact range
 */
export const ProximityLevelSchema = z.enum(['distant', 'near', 'close', 'intimate']);
export type ProximityLevel = z.infer<typeof ProximityLevelSchema>;

// =============================================================================
// Full Proximity State Schema
// =============================================================================

/**
 * Complete proximity state for a session.
 * Tracks all active sensory engagements and general NPC proximity levels.
 */
export const ProximityStateSchema = z.object({
  /**
   * Active sensory engagements keyed by `${npcId}:${bodyPart}:${senseType}`
   * Example: { 'taylor:hair:smell': { ... } }
   */
  engagements: z.record(z.string(), SensoryEngagementSchema),

  /**
   * General proximity level to each NPC, keyed by npcId.
   * Example: { 'taylor': 'close', 'alex': 'distant' }
   */
  npcProximity: z.record(z.string(), ProximityLevelSchema),
});
export type ProximityState = z.infer<typeof ProximityStateSchema>;

// =============================================================================
// Proximity Update Action Schema
// =============================================================================

/**
 * Actions that can be performed on a proximity/engagement state.
 * - engage: Start a new sensory engagement
 * - intensify: Increase engagement intensity
 * - reduce: Decrease engagement intensity
 * - end: Remove the engagement entirely
 */
export const ProximityActionSchema = z.enum(['engage', 'intensify', 'reduce', 'end']);
export type ProximityAction = z.infer<typeof ProximityActionSchema>;

/**
 * Parameters for an update_proximity tool call.
 */
export const UpdateProximityParamsSchema = z.object({
  /** NPC identifier */
  npcId: z.string(),

  /** Body part involved */
  bodyPart: z.string(),

  /** Type of sense being engaged */
  senseType: SenseTypeSchema,

  /** Action to perform */
  action: ProximityActionSchema,

  /** New intensity level (for engage/intensify/reduce) */
  newIntensity: EngagementIntensitySchema.optional(),
});
export type UpdateProximityParams = z.infer<typeof UpdateProximityParamsSchema>;

// =============================================================================
// Default State Factory
// =============================================================================

/**
 * Create a default/empty proximity state.
 */
export function createDefaultProximityState(): ProximityState {
  return {
    engagements: {},
    npcProximity: {},
  };
}

/**
 * Generate engagement key from components.
 */
export function makeEngagementKey(npcId: string, bodyPart: string, senseType: SenseType): string {
  return `${npcId}:${bodyPart}:${senseType}`;
}

/**
 * Parse engagement key into components.
 */
export function parseEngagementKey(
  key: string
): { npcId: string; bodyPart: string; senseType: SenseType } | null {
  const parts = key.split(':');
  if (parts.length !== 3) return null;

  const [npcId, bodyPart, senseTypeRaw] = parts;
  const parseResult = SenseTypeSchema.safeParse(senseTypeRaw);
  if (!parseResult.success) return null;

  return { npcId: npcId!, bodyPart: bodyPart!, senseType: parseResult.data };
}
