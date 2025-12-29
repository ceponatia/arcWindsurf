/**
 * Types for sensory agent functionality.
 */

import type { AgentConfig, IntentType } from '../core/types.js';
import type { BodyRegion } from '@minimal-rpg/schemas';

// Re-export BodyRegion for convenience
export type { BodyRegion } from '@minimal-rpg/schemas';

/**
 * Sensory intent types handled by the SensoryAgent.
 */
export type SensoryIntentType = Extract<IntentType, 'smell' | 'taste' | 'touch' | 'listen'>;

/**
 * All sensory intent types as an array for iteration.
 */
export const SENSORY_INTENT_TYPES: readonly SensoryIntentType[] = [
  'smell',
  'taste',
  'touch',
  'listen',
] as const;

/**
 * Check if an intent type is a sensory intent.
 */
export function isSensoryIntent(type: IntentType): type is SensoryIntentType {
  return type === 'smell' || type === 'taste' || type === 'touch' || type === 'listen';
}

/**
 * Scent data extracted from character profile.
 * Matches @minimal-rpg/schemas ScentSchema structure (legacy).
 * @deprecated Use RegionScent from @minimal-rpg/schemas for per-region scents.
 */
export interface ScentData {
  hairScent?: string;
  bodyScent?: string;
  perfume?: string;
}

/**
 * Target entity types for sensory intents.
 */
export type SensoryTargetType = 'character' | 'item' | 'location' | 'unknown';

/**
 * Result of extracting sensory context from state slices.
 */
export interface SensoryContext {
  /** The target entity type (character, item, location, or unknown) */
  targetType: SensoryTargetType;

  /** Name of the target (e.g., character name) */
  targetName: string | undefined;

  /** Resolved body region being targeted (for character targets) */
  bodyRegion: BodyRegion;

  /** Raw body part reference from player input (before resolution) */
  rawBodyPart: string | undefined;

  /** Specific sensory data for the requested sense */
  sensoryData: Record<string, string>;

  /** Whether any sensory data was found */
  hasSensoryData: boolean;

  /** Whether the body part was explicitly specified by the player */
  isExplicitBodyPart: boolean;
}

/**
 * Configuration for the SensoryService.
 */
export interface SensoryServiceConfig extends AgentConfig {
  /**
   * Confidence threshold for LLM inference when no explicit
   * sensory data is available. If the target has enough context
   * for the LLM to make a reasonable inference, it may generate
   * a response above this threshold.
   *
   * Default: 0.8 (high confidence required)
   */
  inferenceThreshold?: number;

  /**
   * Whether to allow LLM inference when no explicit sensory data exists.
   * If false, the service will silently ignore intents without data.
   *
   * Default: true
   */
  allowInference?: boolean;

  /**
   * Default body region to use when player doesn't specify one.
   * Default: 'torso' (general body scent)
   */
  defaultBodyRegion?: BodyRegion;

  /**
   * Whether to include body region context in LLM prompts.
   * When true, prompts will mention the specific body region being sensed.
   *
   * Default: true
   */
  includeBodyRegionInPrompts?: boolean;
}

/**
 * @deprecated Use SensoryServiceConfig instead
 */
export type SensoryAgentConfig = SensoryServiceConfig;
