/**
 * Tier State Service
 *
 * Manages player interest scores and NPC tier promotions.
 * Tracks which NPCs the player has shown interest in and handles
 * automatic promotion from background to minor to major NPCs.
 *
 * @see dev-docs/30-npc-tiers-and-promotion.md
 */
import type {
  PlayerInterestScore,
  InteractionEvent,
  PromotionCheck,
  InterestConfig,
} from '@minimal-rpg/schemas';

/** NPC tier type alias */
type NpcTierType = 'major' | 'minor' | 'background' | 'transient';
import {
  updateInterestScore,
  checkPromotion,
  isMeaningfulInteraction,
  DEFAULT_INTEREST_CONFIG,
  createInitialInterestScore,
} from '@minimal-rpg/schemas';
import {
  getPlayerInterestScore,
  getAllPlayerInterestScores,
  getNpcsAboveInterestThreshold,
  upsertPlayerInterestScore,
  updateNpcTier,
} from '../db/sessionsClient.js';

// Define local interface to fix lint errors with imported type
interface LocalPlayerInterestRecord {
  npcId: string;
  score: number;
  totalInteractions: number;
  turnsSinceInteraction: number;
  peakScore: number;
  currentTier: string;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Result of processing interest for a turn.
 */
export interface TurnInterestResult {
  /** NPCs whose interest scores were updated */
  updated: { npcId: string; oldScore: number; newScore: number }[];
  /** NPCs that should be promoted */
  promotions: PromotionCheck[];
}

/**
 * Options for processing turn interest.
 */
export interface ProcessInterestOptions {
  /** Owner key for tenancy scoping */
  ownerEmail: string;

  /** Session ID */
  sessionId: string;
  /** NPC IDs that were interacted with this turn */
  interactedNpcIds: string[];
  /** All NPC IDs in the session (for bleed calculation) */
  allNpcIds: string[];
  /** Details about each interaction */
  interactions?: Map<string, Partial<Omit<InteractionEvent, 'meaningful'>>>;
  /** Interest config (defaults to DEFAULT_INTEREST_CONFIG) */
  config?: InterestConfig;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get player interest score for an NPC.
 * Returns null if no interest record exists.
 */
export async function getInterestScore(
  ownerEmail: string,
  sessionId: string,
  npcId: string
): Promise<PlayerInterestScore | null> {
  const record = await getPlayerInterestScore(ownerEmail, sessionId, npcId);
  if (!record) return null;

  return recordToInterestScore(record);
}

/**
 * Get all player interest scores for a session.
 */
export async function getAllInterestScores(
  ownerEmail: string,
  sessionId: string
): Promise<Map<string, PlayerInterestScore>> {
  const records = (await getAllPlayerInterestScores(ownerEmail, sessionId)) as unknown as Map<
    string,
    LocalPlayerInterestRecord
  >;
  const result = new Map<string, PlayerInterestScore>();

  for (const [npcId, record] of records) {
    result.set(npcId, recordToInterestScore(record));
  }

  return result;
}

/**
 * Process interest score updates after a turn.
 * Updates scores for interacted NPCs and applies bleed to others.
 *
 * @param options - Processing options
 * @returns Results including updated scores and pending promotions
 */
export async function processTurnInterest(
  options: ProcessInterestOptions
): Promise<TurnInterestResult> {
  const {
    ownerEmail,
    sessionId,
    interactedNpcIds,
    allNpcIds,
    interactions = new Map<string, Partial<Omit<InteractionEvent, 'meaningful'>>>(),
    config = DEFAULT_INTEREST_CONFIG,
  } = options;

  const updated: TurnInterestResult['updated'] = [];
  const promotions: PromotionCheck[] = [];

  // Get existing interest scores
  const existingScores = (await getAllPlayerInterestScores(
    ownerEmail,
    sessionId
  )) as unknown as Map<string, LocalPlayerInterestRecord>;

  // Process each NPC
  for (const npcId of allNpcIds) {
    const existing = existingScores.get(npcId);
    const currentScore = existing
      ? recordToInterestScore(existing)
      : createInitialInterestScore(npcId);

    const oldScore = currentScore.score;
    const hadInteraction = interactedNpcIds.includes(npcId);

    // Build interaction event if interacted
    let interactionEvent: InteractionEvent | null = null;
    if (hadInteraction) {
      const details = interactions.get(npcId) ?? {};
      const event: Omit<InteractionEvent, 'meaningful'> = {
        type: details.type ?? 'dialogue',
        namedNpc: details.namedNpc ?? false,
        askedQuestions: details.askedQuestions ?? false,
        affinityChanged: details.affinityChanged ?? false,
        proximityEngagement: details.proximityEngagement ?? false,
      };
      interactionEvent = {
        ...event,
        meaningful: isMeaningfulInteraction(event),
      };
    }

    // Update score
    const newScore = updateInterestScore(currentScore, interactionEvent, config);

    // Skip if no meaningful change
    if (Math.abs(newScore.score - oldScore) < 0.01 && !hadInteraction) {
      continue;
    }

    // Persist updated score
    const tier = (existing?.currentTier ?? 'background') as NpcTierType;
    await upsertPlayerInterestScore(
      ownerEmail,
      sessionId,
      npcId,
      newScore.score,
      newScore.totalInteractions,
      newScore.turnsSinceInteraction,
      newScore.peakScore,
      tier
    );

    updated.push({
      npcId,
      oldScore,
      newScore: newScore.score,
    });

    // Check for promotion
    const promotionCheck = checkPromotion(npcId, tier, newScore, config);
    if (promotionCheck.shouldPromote) {
      promotions.push(promotionCheck);
    }
  }

  return { updated, promotions };
}

/**
 * Execute a promotion for an NPC.
 * Updates the tier in the database.
 *
 * @param sessionId - Session ID
 * @param npcId - NPC to promote
 * @param newTier - Target tier
 */
export async function executePromotion(
  ownerEmail: string,
  sessionId: string,
  npcId: string,
  newTier: NpcTierType
): Promise<void> {
  await updateNpcTier(ownerEmail, sessionId, npcId, newTier);
}

/**
 * Get NPCs ready for promotion in a session.
 * Useful for batch promotion checks.
 */
export async function getNpcsReadyForPromotion(
  ownerEmail: string,
  sessionId: string,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG
): Promise<PromotionCheck[]> {
  const promotions: PromotionCheck[] = [];

  // Check each threshold tier
  const thresholds = [
    {
      tier: 'transient' as NpcTierType,
      threshold: config.promotionThresholds.transientToBackground,
    },
    { tier: 'background' as NpcTierType, threshold: config.promotionThresholds.backgroundToMinor },
    { tier: 'minor' as NpcTierType, threshold: config.promotionThresholds.minorToMajor },
  ];

  for (const { tier, threshold } of thresholds) {
    const records = (await getNpcsAboveInterestThreshold(
      ownerEmail,
      sessionId,
      threshold
    )) as unknown as LocalPlayerInterestRecord[];

    for (const record of records) {
      if (record.currentTier === tier) {
        const score = recordToInterestScore(record);
        const check = checkPromotion(record.npcId, tier, score, config);
        if (check.shouldPromote) {
          promotions.push(check);
        }
      }
    }
  }

  return promotions;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert a database record to a PlayerInterestScore.
 */
function recordToInterestScore(record: unknown): PlayerInterestScore {
  const r = record as LocalPlayerInterestRecord;
  return {
    npcId: r.npcId,
    score: r.score,
    totalInteractions: r.totalInteractions,
    turnsSinceInteraction: r.turnsSinceInteraction,
    peakScore: r.peakScore,
  };
}
