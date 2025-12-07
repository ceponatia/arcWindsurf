import { type IntentType } from './intents.js';

// Re-export IntentType for consumers
export type { IntentType } from './intents.js';

// ============================================================================
// Intent Detection Types
// ============================================================================

/**
 * A segment of a compound intent.
 * When player input contains multiple actions/thoughts/speech/sensory, each is a segment.
 *
 * Example: "If I must *he jokes. He notices the smell of her perfume*"
 * Would produce 2 segments:
 * 1. { type: 'talk', content: 'If I must' }
 * 2. { type: 'sensory', content: 'He notices the smell of her perfume', sensoryType: 'smell' }
 *
 * Note: Text inside *asterisks* is NEVER talk - it's always action/thought/emote/sensory.
 * Text outside asterisks (or in "quotes") is talk.
 */
export interface IntentSegment {
  /**
   * The type of this segment:
   * - 'talk': Direct speech (text NOT in asterisks)
   * - 'action': Physical actions (*sits down*, *walks over*)
   * - 'thought': Internal thoughts (*wonders if...*, *hopes that...*)
   * - 'emote': Emotional reactions (*blushes*, *feels nervous*)
   * - 'sensory': Sensory awareness (*smells her perfume*, *feels the warmth*)
   */
  type: 'talk' | 'action' | 'thought' | 'emote' | 'sensory';

  /** The extracted content for this segment */
  content: string;

  /**
   * For sensory segments, which sense is being engaged:
   * - 'smell': Olfactory awareness (scent, odor, fragrance)
   * - 'touch': Tactile awareness (texture, temperature, pressure)
   * - 'look': Visual focus on specific detail
   * - 'taste': Gustatory awareness
   * - 'listen': Auditory focus
   */
  sensoryType?: 'smell' | 'touch' | 'look' | 'taste' | 'listen' | undefined;

  /**
   * For sensory segments, raw body part reference from player input.
   * Examples: "feet", "hair", "hands". Resolved to canonical region by SensoryAgent.
   */
  bodyPart?: string | undefined;
}

/**
 * A detected intent from player input.
 */
export interface DetectedIntent {
  /** Primary intent type */
  type: IntentType;

  /** Confidence score (0-1) */
  confidence: number;

  /** Intent-specific parameters */
  params?: IntentParams | undefined;

  /** Raw signals that contributed to this detection */
  signals?: string[] | undefined;

  /**
   * When type is 'unknown', the LLM's best guess at what the intent might be.
   * Useful for identifying new intent types to add during development.
   */
  suggestedType?: string | undefined;

  /**
   * For compound inputs containing multiple actions/thoughts/speech.
   * When present, the NPC agent should process all segments in order.
   * The primary `type` reflects the dominant intent for routing purposes.
   */
  segments?: IntentSegment[] | undefined;
}

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
   * Raw player input - should be resolved to canonical BodyRegion by agents.
   * Example: "hair", "feet", "hands", or undefined for general/unspecified.
   */
  bodyPart?: string | undefined;

  /** Action for custom intents */
  action?: string | undefined;

  /**
   * For 'narrate' intents, specifies the type of narrative input:
   * - 'action': Physical action (*sits down*, *walks over*)
   * - 'thought': Internal thought (*wonders if she noticed*)
   * - 'emote': Emotional state/reaction (*blushes*, *feels nervous*)
   * - 'narrative': Third-person storytelling ("The two spend time together")
   *
   * When narrateType is 'thought', the NPC can be narratively aware but
   * the character should not explicitly react to or mention the thought.
   */
  narrateType?: 'action' | 'thought' | 'emote' | 'narrative' | undefined;

  /** Additional free-form parameters */
  extra?: Record<string, unknown> | undefined;
}

/**
 * Interface for intent detection.
 */
export interface IntentDetector {
  /**
   * Detect intent from player input and context.
   */
  detect(input: string, context?: IntentDetectionContext): Promise<IntentDetectionResult>;
}

/**
 * Context for intent detection.
 */
export interface IntentDetectionContext {
  /** Recent message history */
  recentHistory?: string[] | undefined;

  /** Current location name */
  currentLocation?: string | undefined;

  /** Available actions in current context */
  availableActions?: string[] | undefined;

  /** NPCs present in current location */
  presentNpcs?: string[] | undefined;

  /** Items in inventory */
  inventoryItems?: string[] | undefined;
}

/**
 * Debug metadata produced during intent detection.
 */
export interface IntentDetectionDebug {
  /** Identifier for the detector implementation */
  detector: string;

  /** Optional model or strategy used */
  model?: string | undefined;

  /** Prompt snapshot that was sent to the detector */
  prompt?:
    | {
        system: string;
        user: string;
      }
    | undefined;

  /** Recent history lines that were provided */
  historyPreview?: string[] | undefined;

  /** Context bullet points that were included */
  contextSummary?: string[] | undefined;

  /** Raw text response from the detector */
  rawResponse?: string | undefined;

  /** Parsed JSON payload before normalization */
  parsed?: unknown;

  /** Any warnings emitted while parsing */
  warnings?: string[] | undefined;
}

/**
 * Full intent detection result that includes debug artefacts.
 */
export interface IntentDetectionResult {
  /** Normalized intent produced by the detector */
  intent: DetectedIntent;

  /** Optional debug metadata */
  debug?: IntentDetectionDebug | undefined;
}
