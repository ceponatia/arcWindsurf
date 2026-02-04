import type { DialogueConditionContext } from './dialogue-tree-types.js';

/**
 * Context for dialogue resolution.
 */
export interface DialogueContext {
  /** Session id for conversation scoping */
  sessionId: string;
  /** Current conversation topic or state */
  topic?: string;
  /** Previous dialogue history (last N exchanges) */
  history?: readonly string[];
  /** Player's relationship level with the NPC */
  relationshipLevel?: number;
  /** Current location ID */
  locationId?: string;
  /** Condition and effect context for dialogue trees */
  conditionContext?: Partial<DialogueConditionContext>;
}
