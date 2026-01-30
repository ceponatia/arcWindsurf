/**
 * Dialogue tree context and handler types.
 */
import type {
  DialogueItemAction,
  DialogueQuestAction,
  DialogueQuestStatus,
} from '@minimal-rpg/schemas';

/**
 * Custom condition evaluator for dialogue trees.
 */
export type DialogueConditionEvaluator = (
  context: DialogueConditionContext
) => boolean | Promise<boolean>;

/**
 * Effect handler hooks for dialogue trees.
 */
export interface DialogueEffectHandlers {
  /**
   * Handle reputation effects.
   */
  reputation?: (input: {
    sessionId: string;
    actorId: string;
    factionId: string;
    delta: number;
  }) => Promise<void>;

  /**
   * Handle quest progression effects.
   */
  quest?: (input: {
    sessionId: string;
    actorId: string;
    questId: string;
    action: DialogueQuestAction;
  }) => Promise<void>;

  /**
   * Handle item grant/take effects.
   */
  item?: (input: {
    sessionId: string;
    actorId: string;
    itemId: string;
    action: DialogueItemAction;
    quantity?: number | undefined;
  }) => Promise<void>;

  /**
   * Handle flag toggle effects.
   */
  flag?: (input: {
    sessionId: string;
    actorId: string;
    flagId: string;
    value: boolean;
  }) => Promise<void>;

  /**
   * Handle custom effects.
   */
  custom?: (input: {
    sessionId: string;
    actorId: string;
    handler: string;
  }) => Promise<void>;
}

/**
 * Context for evaluating dialogue tree conditions and effects.
 */
export interface DialogueConditionContext {
  /** Session scope for state updates */
  sessionId: string;
  /** Actor receiving effects (usually the player) */
  actorId: string;
  /** NPC identifier for the dialogue */
  npcId: string;
  /** Relationship score (general) */
  relationshipLevel?: number | undefined;
  /** Relationship scores per faction */
  relationshipByFactionId?: Record<string, number> | undefined;
  /** Quest status map */
  questStatus?: Record<string, DialogueQuestStatus> | undefined;
  /** Item counts by item id */
  itemCounts?: Record<string, number> | undefined;
  /** Boolean flags for state checks */
  flags?: Record<string, boolean> | undefined;
  /** Current time marker (game time or turn count) */
  time?: number | undefined;
  /** Custom condition evaluators */
  customConditionEvaluators?: Record<string, DialogueConditionEvaluator> | undefined;
  /** Effect handlers */
  effectHandlers?: DialogueEffectHandlers | undefined;
}
