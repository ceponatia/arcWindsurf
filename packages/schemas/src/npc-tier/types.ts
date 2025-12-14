/**
 * NPC Tier System Types
 *
 * Defines NPC tiers, tier configuration, player interest tracking,
 * and promotion mechanics.
 *
 * @see dev-docs/30-npc-tiers-and-promotion.md
 */

// =============================================================================
// NPC Tier Definitions
// =============================================================================

/**
 * NPC tier classification based on narrative importance.
 *
 * - major: Love interest, party member, nemesis - full profile, eager simulation
 * - minor: Shopkeeper, bartender, classmate - partial profile, lazy simulation
 * - background: Random cafe patron, street vendor - minimal profile, on-demand
 * - transient: Monsters, one-off encounters - generated, discarded after encounter
 */
export type NpcTier = 'major' | 'minor' | 'background' | 'transient';

/**
 * Profile depth indicating how much character data is required.
 *
 * - full: Complete CharacterProfile with all fields
 * - partial: Name, appearance, key personality traits
 * - minimal: Name, 1-2 traits, appearance snippet
 * - generated: Created on-the-fly from templates
 */
export type ProfileDepth = 'full' | 'partial' | 'minimal' | 'generated';

/**
 * Configuration for an NPC tier defining behavior and resource allocation.
 */
export interface NpcTierConfig {
  /** The tier this configuration applies to */
  tier: NpcTier;

  /** How much character data is required/generated */
  profileDepth: ProfileDepth;

  /** Whether this NPC has a persistent schedule */
  hasSchedule: boolean;

  /** Whether state changes are persisted between sessions */
  persistState: boolean;

  /** Can this NPC be promoted to a higher tier? */
  promotable: boolean;

  /** Simulation priority (affects update frequency, 0-10) */
  simulationPriority: number;
}

// =============================================================================
// Player Interest Score Types
// =============================================================================

/**
 * Tracks player interest in an NPC for promotion mechanics.
 * Interest bleeds over time but at a reduced rate for high-investment NPCs.
 */
export interface PlayerInterestScore {
  /** NPC identifier */
  npcId: string;

  /** Current interest score (0-100+) */
  score: number;

  /** Total interactions ever (for diminishing bleed) */
  totalInteractions: number;

  /** Turns since last interaction */
  turnsSinceInteraction: number;

  /** Peak score ever reached (affects bleed rate) */
  peakScore: number;
}

/**
 * Configuration for interest score mechanics.
 */
export interface InterestConfig {
  /** Points gained per interaction turn */
  pointsPerInteraction: number;

  /** Bonus points for meaningful interactions */
  meaningfulInteractionBonus: number;

  /** Base bleed rate per turn (percentage as decimal, e.g., 0.05 = 5%) */
  baseBleedRate: number;

  /** Minimum bleed rate (for high-investment NPCs) */
  minBleedRate: number;

  /** Thresholds for promotion */
  promotionThresholds: PromotionThresholds;
}

/**
 * Interest score thresholds required for tier promotion.
 */
export interface PromotionThresholds {
  /** Score needed to promote transient → background */
  transientToBackground: number;

  /** Score needed to promote background → minor */
  backgroundToMinor: number;

  /** Score needed to promote minor → major */
  minorToMajor: number;
}

// =============================================================================
// Interaction Event Types
// =============================================================================

/**
 * Type of player-NPC interaction.
 */
export type InteractionType = 'dialogue' | 'action' | 'observation';

/**
 * Represents a player-NPC interaction for interest scoring.
 */
export interface InteractionEvent {
  /** Type of interaction */
  type: InteractionType;

  /** Did the player address this NPC by name? */
  namedNpc: boolean;

  /** Did the player ask questions or request information? */
  askedQuestions: boolean;

  /** Did affinity change as a result? */
  affinityChanged: boolean;

  /** Was there physical contact or proximity change? */
  proximityEngagement: boolean;

  /** Computed: is this a meaningful interaction? */
  meaningful: boolean;
}

// =============================================================================
// Promotion Types
// =============================================================================

/**
 * Result of checking if an NPC should be promoted.
 */
export interface PromotionCheck {
  /** NPC identifier */
  npcId: string;

  /** Current tier */
  currentTier: NpcTier;

  /** Current interest score */
  currentScore: number;

  /** Whether promotion is warranted */
  shouldPromote: boolean;

  /** Target tier if promoted */
  targetTier?: NpcTier | undefined;

  /** Score threshold that was met */
  thresholdMet?: number | undefined;
}

/**
 * Fields that need to be generated when promoting an NPC.
 */
export interface ProfileExpansionTask {
  /** Fields to generate via LLM */
  fieldsToGenerate: string[];

  /** Existing data to provide context */
  existingData: Record<string, unknown>;

  /** Interaction history to inform generation */
  interactionSummary: string[];
}

/**
 * Result of promoting an NPC to a higher tier.
 */
export interface PromotionResult {
  /** NPC identifier */
  npcId: string;

  /** Previous tier */
  fromTier: NpcTier;

  /** New tier */
  toTier: NpcTier;

  /** Fields that need to be generated/expanded */
  profileExpansion: ProfileExpansionTask;

  /** New schedule to assign (for minor+) */
  scheduleTemplateId?: string | undefined;
}

// =============================================================================
// Simulation Priority Types
// =============================================================================

/**
 * Tracks simulation priority for an NPC.
 * Priority can decay over time but never below tier minimum.
 */
export interface SimulationPriority {
  /** NPC identifier */
  npcId: string;

  /** Base priority from tier */
  basePriority: number;

  /** Current priority (adjusted by recency) */
  currentPriority: number;

  /** Turn number of last interaction */
  lastInteractionTurn: number;
}

/**
 * Simulation strategy based on priority level.
 */
export type SimulationStrategy = 'eager' | 'active' | 'lazy' | 'on-demand';

// =============================================================================
// Transient NPC Types
// =============================================================================

/**
 * Minimal profile for transient NPCs (generated on-the-fly).
 */
export interface TransientNpcProfile {
  /** Generated or template-based name */
  name: string;

  /** Species/race if applicable */
  species?: string | undefined;

  /** 1-3 descriptive adjectives */
  adjectives: string[];

  /** Brief appearance snippet */
  appearanceSnippet: string;

  /** Template this was generated from */
  templateId?: string | undefined;

  /** Location where encountered */
  encounteredAt: string;

  /** Turn number when encountered */
  encounteredTurn: number;
}
