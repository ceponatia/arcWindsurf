/**
 * Eavesdropping Schemas
 *
 * Tracks when the player can overhear NPC-NPC conversations.
 * Only applies to major NPCs when the player is present but not engaged.
 *
 * @see dev-docs/32-npc-encounters-and-occupancy.md Section 5.3
 */
import { z } from 'zod';
import { CrowdLevelSchema, type CrowdLevel } from './occupancy.js';
import { InteractionProximitySchema, type InteractionProximity } from './npc-location.js';

// =============================================================================
// Audibility Level
// =============================================================================

/**
 * How clearly the player can hear a conversation.
 * - clear: Can hear every word
 * - muffled: Can hear most of it but some words are lost
 * - fragments: Can only catch snippets
 */
export const AudibilityLevelSchema = z.enum(['clear', 'muffled', 'fragments']);
export type AudibilityLevel = z.infer<typeof AudibilityLevelSchema>;

/**
 * Relationship between NPCs having a conversation.
 */
export const NpcRelationshipSchema = z.enum(['friendly', 'neutral', 'tense', 'hostile']);
export type NpcRelationship = z.infer<typeof NpcRelationshipSchema>;

// =============================================================================
// Eavesdrop Context
// =============================================================================

/**
 * Context for an eavesdropping opportunity.
 */
export const EavesdropContextSchema = z.object({
  /** The NPCs having the conversation */
  participants: z.array(z.string().min(1)).min(2),

  /** Topic of conversation (for LLM prompt) */
  topic: z.string().optional(),

  /** Relationship between the NPCs */
  relationship: NpcRelationshipSchema,

  /** Can player hear clearly? */
  audibility: AudibilityLevelSchema,

  /** Location where the conversation is happening */
  locationId: z.string().min(1),
});
export type EavesdropContext = z.infer<typeof EavesdropContextSchema>;

// =============================================================================
// Audibility Calculation
// =============================================================================

/**
 * Determine how clearly the player can hear a conversation.
 */
export function determineAudibility(
  playerProximity: InteractionProximity,
  crowdLevel: CrowdLevel
): AudibilityLevel {
  if (playerProximity === 'intimate' || playerProximity === 'close') {
    return crowdLevel === 'packed' ? 'muffled' : 'clear';
  }
  if (playerProximity === 'near') {
    if (crowdLevel === 'empty' || crowdLevel === 'sparse') return 'clear';
    if (crowdLevel === 'packed') return 'fragments';
    return 'muffled';
  }
  if (playerProximity === 'far') {
    return 'fragments';
  }
  // observing
  return 'fragments';
}

// =============================================================================
// NPC-NPC Interaction Snippets
// =============================================================================

/**
 * Pre-defined interaction snippets for lightweight NPC-NPC simulation.
 * These are templates, not scripts - the LLM can use or ignore them.
 */
export const NPC_INTERACTION_SNIPPETS: Record<NpcRelationship, string[]> = {
  friendly: [
    '{npc1} laughs at something {npc2} said.',
    '{npc1} and {npc2} are deep in conversation.',
    '{npc1} gestures animatedly while talking to {npc2}.',
    '{npc1} shares a knowing look with {npc2}.',
  ],
  neutral: [
    '{npc1} nods politely at {npc2}.',
    '{npc1} and {npc2} exchange a few words.',
    '{npc1} acknowledges {npc2} with a brief greeting.',
  ],
  tense: [
    '{npc1} and {npc2} speak in low, clipped tones.',
    'There is a strained politeness between {npc1} and {npc2}.',
    "{npc1} avoids {npc2}'s gaze.",
  ],
  hostile: [
    '{npc1} pointedly ignores {npc2}.',
    'There is a tense silence between {npc1} and {npc2}.',
    '{npc1} and {npc2} eye each other warily.',
    '{npc1} turns away as {npc2} approaches.',
  ],
};

/**
 * Get a random interaction snippet for a relationship type.
 */
export function getInteractionSnippet(
  relationship: NpcRelationship,
  npc1Name: string,
  npc2Name: string
): string {
  const snippets = NPC_INTERACTION_SNIPPETS[relationship];
  const index = Math.floor(Math.random() * snippets.length);
  const template = snippets[index] ?? snippets[0] ?? '{npc1} and {npc2} are present.';
  return template.replace('{npc1}', npc1Name).replace('{npc2}', npc2Name);
}
