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
import { getActorState, listActorStatesForSession, upsertActorState } from '@minimal-rpg/db/node';
import { toSessionId } from '../utils/uuid.js';
import { asNpcState } from '../types/index.js';

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get player interest score for an NPC.
 * Returns null if no interest record exists.
 */
export async function getInterestScore(
  _ownerEmail: string,
  sessionId: string,
  npcId: string
): Promise<PlayerInterestScore | null> {
  const actorState = await getActorState(toSessionId(sessionId), npcId);
  if (!actorState) return null;

  const state = asNpcState(actorState.state);
  if (!state.interest) return null;

  return state.interest;
}

/**
 * Get all player interest scores for a session.
 */
export async function getAllInterestScores(
  _ownerEmail: string,
  sessionId: string
): Promise<Map<string, PlayerInterestScore>> {
  const states = await listActorStatesForSession(toSessionId(sessionId));
  const result = new Map<string, PlayerInterestScore>();

  for (const s of states) {
    if (s.actorType === 'npc') {
      const state = asNpcState(s.state);
      if (state.interest) {
        result.set(s.actorId, state.interest);
      }
    }
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
    sessionId,
    interactedNpcIds,
    allNpcIds,
    interactions = new Map<string, Partial<Omit<InteractionEvent, 'meaningful'>>>(),
    config = DEFAULT_INTEREST_CONFIG,
  } = options;

  const updated: TurnInterestResult['updated'] = [];
  const promotions: PromotionCheck[] = [];

  // Get current NPC states
  const npcStates = (await listActorStatesForSession(toSessionId(sessionId))).filter(
    (s) => s.actorType === 'npc'
  );

  const statesByNpcId = new Map(npcStates.map((s) => [s.actorId, s]));

  // Process each NPC
  for (const npcId of allNpcIds) {
    const actorState = statesByNpcId.get(npcId);
    if (!actorState) continue;

    const stateBlob = asNpcState(actorState.state);
    const currentScore: PlayerInterestScore = stateBlob.interest ?? createInitialInterestScore(npcId);

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

    const currentTier = (stateBlob.tier ?? 'background') as NpcTierType;

    // Persist updated score
    const newState = {
      ...stateBlob,
      interest: newScore,
    };

    await upsertActorState({
      sessionId: toSessionId(sessionId),
      actorType: actorState.actorType,
      actorId: npcId,
      entityProfileId: actorState.entityProfileId ?? null,
      state: newState,
      lastEventSeq: actorState.lastEventSeq,
    });

    updated.push({
      npcId,
      oldScore,
      newScore: newScore.score,
    });

    // Check for promotion
    const promotionCheck = checkPromotion(npcId, currentTier, newScore, config);
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
  _ownerEmail: string,
  sessionId: string,
  npcId: string,
  newTier: NpcTierType
): Promise<void> {
  const actorState = await getActorState(toSessionId(sessionId), npcId);
  if (!actorState) return;

  const newState = {
    ...asNpcState(actorState.state),
    tier: newTier,
  };

  await upsertActorState({
    sessionId: toSessionId(sessionId),
    actorType: actorState.actorType,
    actorId: npcId,
    entityProfileId: actorState.entityProfileId ?? null,
    state: newState,
    lastEventSeq: actorState.lastEventSeq,
  });
}

/**
 * Get NPCs ready for promotion in a session.
 * Useful for batch promotion checks.
 */
export async function getNpcsReadyForPromotion(
  _ownerEmail: string,
  sessionId: string,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG
): Promise<PromotionCheck[]> {
  const promotions: PromotionCheck[] = [];

  const npcStates = (await listActorStatesForSession(toSessionId(sessionId))).filter(
    (s) => s.actorType === 'npc'
  );

  for (const s of npcStates) {
    const stateBlob = asNpcState(s.state);
    const tier = (stateBlob.tier ?? 'background') as NpcTierType;
    const score = stateBlob.interest;

    if (score) {
      const check = checkPromotion(s.actorId, tier, score, config);
      if (check.shouldPromote) {
        promotions.push(check);
      }
    }
  }

  return promotions;
}

// =============================================================================
// Types (Local for Fix)
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
