/**
 * Intent detection types.
 */

/**
 * A segment of a compound intent input.
 * Used when player input mixes speech, actions, thoughts, and sensory awareness.
 *
 * ASTERISK RULE: Text in *asterisks* is NEVER talk.
 * - Text outside asterisks = talk (speech)
 * - Text inside asterisks = action/thought/emote/sensory
 */
export interface IntentSegment {
  /**
   * Segment type:
   * - 'talk': Direct speech (either NOT in asterisks or IS in quotes)
   * - 'action': Physical actions (*sits down*)
   * - 'thought': Internal thoughts (*wonders if...*)
   * - 'emote': Emotional reactions (*blushes*)
   * - 'sensory': Sensory awareness (*smells perfume*)
   */
  type: 'talk' | 'action' | 'thought' | 'emote' | 'sensory';

  /** The extracted text content for this segment */
  content: string;

  /** For sensory segments, which sense: smell, touch, look, taste, or listen */
  sensoryType?: 'smell' | 'touch' | 'look' | 'taste' | 'listen' | undefined;

  /** For sensory segments, raw body part reference (e.g., "feet", "hair") */
  bodyPart?: string | undefined;
}

/**
 * Intent detection output.
 */
export interface AgentIntent {
  /** The detected intent type (e.g., 'move', 'talk', 'inspect', 'use') */
  type: IntentType;

  /** Additional intent parameters extracted from input */
  params: IntentParams;

  /** Confidence score (0-1) */
  confidence: number;

  /** Raw tokens/phrases that contributed to this classification */
  signals?: string[];

  /**
   * For compound inputs, ordered segments of different intent types.
   * Example: action + speech + thought in one player turn.
   * When present, agents should process all segments in order.
   */
  segments?: IntentSegment[] | undefined;
}

/**
 * Known intent types.
 * Extended as new agent behaviors are added.
 */
export type IntentType =
  | 'move'
  | 'look'
  | 'talk'
  | 'use'
  | 'take'
  | 'give'
  | 'attack'
  | 'examine'
  | 'wait'
  | 'system'
  | 'smell'
  | 'taste'
  | 'touch'
  | 'listen'
  | 'narrate'
  | 'custom';

/**
 * Parameters associated with an intent.
 */
export interface IntentParams {
  /** Target entity (NPC name, item, location) */
  target?: string | undefined;

  /** Canonical NPC identifier when addressing a specific NPC */
  npcId?: string | undefined;

  /** Direction for movement */
  direction?: string | undefined;

  /** Item being used/given/taken */
  item?: string | undefined;

  /**
   * Body part reference for sensory intents (smell, touch, look).
   * Raw player input - resolved to canonical BodyRegion by agents.
   */
  bodyPart?: string | undefined;

  /** Action for custom intents */
  action?: string | undefined;

  /**
   * For 'narrate' intents, specifies the type of narrative input.
   */
  narrateType?: 'action' | 'thought' | 'emote' | 'narrative' | undefined;

  /**
   * When true, indicates this is an auto-interjection by the Governor.
   */
  interject?: boolean | undefined;

  /** Additional free-form parameters */
  extra?: Record<string, unknown>;
}
