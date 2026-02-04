/**
 * Proximity Service
 *
 * High-level service for managing proximity and sensory engagements between
 * player and NPCs. Provides an instantiable service interface that can be
 * injected into agents and other consumers.
 *
 * Uses SpatialIndex internally for low-level state operations.
 *
 * @see SpatialIndex for the underlying spatial operations
 * @see @minimal-rpg/schemas/state/proximity for type definitions
 */
import {
  type ProximityState,
  type SensoryEngagement,
  type ProximityLevel,
  type SenseType,
  type EngagementIntensity,
  createDefaultProximityState,
} from '@minimal-rpg/schemas';

import {
  SpatialIndex,
  type SpatialUpdateResult,
  type SpatialUpdateProximityParams,
} from './spatial-index.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a proximity query operation.
 */
export interface ProximityQueryResult {
  engagements: SensoryEngagement[];
  proximityLevel?: ProximityLevel | undefined;
}

/**
 * Options for filtering engagements.
 */
export interface EngagementFilterOptions {
  /** Filter by sense type */
  senseType?: SenseType;
  /** Filter by body part */
  bodyPart?: string;
  /** Only include engagements at or above this intensity */
  minIntensity?: EngagementIntensity;
  /** Only include engagements active within N ticks */
  activeWithinTicks?: number;
  /** Current tick for recency filtering */
  currentTick?: number;
}

// =============================================================================
// ProximityService
// =============================================================================

/**
 * ProximityService
 *
 * Stateless service for proximity and engagement operations.
 * Provides a high-level API for managing sensory relationships.
 *
 * Design notes:
 * - Instantiable class to allow for future configuration/DI
 * - Methods operate on passed-in state (no internal state)
 * - Delegates to SpatialIndex for low-level operations
 */
export class ProximityService {
  // ===========================================================================
  // State Factory
  // ===========================================================================

  /**
   * Create a new default proximity state.
   */
  createDefaultState(): ProximityState {
    return createDefaultProximityState();
  }

  // ===========================================================================
  // Engagement Queries (implements ProximityServiceLike)
  // ===========================================================================

  /**
   * Get all active engagements for an NPC.
   *
   * This is the primary method required by ProximityServiceLike interface.
   *
   * @param state - The proximity state to query
   * @param npcId - The NPC identifier
   * @returns Array of sensory engagements for the NPC
   */
  getEngagementsForNpc(state: ProximityState, npcId: string): SensoryEngagement[] {
    return SpatialIndex.getEngagementsForNpc(state, npcId);
  }

  /**
   * Get engagements with optional filtering.
   */
  getFilteredEngagements(
    state: ProximityState,
    npcId: string,
    options: EngagementFilterOptions = {}
  ): SensoryEngagement[] {
    let engagements = this.getEngagementsForNpc(state, npcId);

    if (options.senseType) {
      engagements = engagements.filter((e) => e.senseType === options.senseType);
    }

    if (options.bodyPart) {
      engagements = engagements.filter((e) => e.bodyPart === options.bodyPart);
    }

    if (options.minIntensity) {
      const intensityOrder: EngagementIntensity[] = ['casual', 'focused', 'intimate'];
      const minIndex = intensityOrder.indexOf(options.minIntensity);
      engagements = engagements.filter((e) => intensityOrder.indexOf(e.intensity) >= minIndex);
    }

    if (options.activeWithinTicks !== undefined && options.currentTick !== undefined) {
      const threshold = options.currentTick - options.activeWithinTicks;
      engagements = engagements.filter((e) => e.lastActiveAt >= threshold);
    }

    return engagements;
  }

  /**
   * Get recent engagements across all NPCs.
   */
  getRecentEngagements(
    state: ProximityState,
    currentTick: number,
    withinTicks = 3
  ): SensoryEngagement[] {
    return SpatialIndex.getRecentEngagements(state, currentTick, withinTicks);
  }

  /**
   * Check if there's any active engagement with an NPC.
   */
  hasActiveEngagement(state: ProximityState, npcId: string): boolean {
    return this.getEngagementsForNpc(state, npcId).length > 0;
  }

  /**
   * Get the highest intensity engagement with an NPC.
   */
  getHighestIntensityEngagement(
    state: ProximityState,
    npcId: string
  ): SensoryEngagement | undefined {
    const engagements = this.getEngagementsForNpc(state, npcId);
    if (engagements.length === 0) return undefined;

    const intensityOrder: EngagementIntensity[] = ['casual', 'focused', 'intimate'];
    return engagements.reduce((highest, current) => {
      const currentIndex = intensityOrder.indexOf(current.intensity);
      const highestIndex = intensityOrder.indexOf(highest.intensity);
      return currentIndex > highestIndex ? current : highest;
    });
  }

  // ===========================================================================
  // Proximity Level Queries
  // ===========================================================================

  /**
   * Get the general proximity level to an NPC.
   */
  getNpcProximityLevel(state: ProximityState, npcId: string): ProximityLevel | undefined {
    return SpatialIndex.getNpcProximityLevel(state, npcId);
  }

  /**
   * Get full proximity info for an NPC (engagements + level).
   */
  getNpcProximityInfo(state: ProximityState, npcId: string): ProximityQueryResult {
    return {
      engagements: this.getEngagementsForNpc(state, npcId),
      proximityLevel: this.getNpcProximityLevel(state, npcId),
    };
  }

  /**
   * Check if player is within a certain proximity level of NPC.
   */
  isWithinProximity(state: ProximityState, npcId: string, maxLevel: ProximityLevel): boolean {
    const level = this.getNpcProximityLevel(state, npcId);
    if (!level) return false;

    const levelOrder: ProximityLevel[] = ['distant', 'near', 'close', 'intimate'];
    return levelOrder.indexOf(level) >= levelOrder.indexOf(maxLevel);
  }

  // ===========================================================================
  // State Mutations
  // ===========================================================================

  /**
   * Update or create a sensory engagement.
   */
  updateEngagement(
    state: ProximityState,
    params: SpatialUpdateProximityParams
  ): SpatialUpdateResult {
    return SpatialIndex.updateEngagement(state, params);
  }

  /**
   * Set the general proximity level to an NPC.
   */
  setNpcProximityLevel(
    state: ProximityState,
    npcId: string,
    level: ProximityLevel
  ): SpatialUpdateResult {
    return SpatialIndex.setNpcProximityLevel(state, npcId, level);
  }

  /**
   * Start a new engagement with an NPC body part.
   * Convenience method for common use case.
   */
  startEngagement(
    state: ProximityState,
    npcId: string,
    bodyPart: string,
    senseType: SenseType,
    intensity: EngagementIntensity,
    currentTick: number
  ): SpatialUpdateResult {
    return this.updateEngagement(state, {
      npcId,
      bodyPart,
      senseType,
      action: 'engage',
      newIntensity: intensity,
      currentTick,
    });
  }

  /**
   * End a specific engagement.
   */
  endEngagement(
    state: ProximityState,
    npcId: string,
    bodyPart: string,
    senseType: SenseType,
    currentTick: number
  ): SpatialUpdateResult {
    return this.updateEngagement(state, {
      npcId,
      bodyPart,
      senseType,
      action: 'end',
      currentTick,
    });
  }

  /**
   * End all engagements with an NPC.
   */
  endAllEngagementsForNpc(state: ProximityState, npcId: string): SpatialUpdateResult {
    return SpatialIndex.endAllEngagementsForNpc(state, npcId);
  }

  /**
   * Touch an engagement to update its lastActiveAt timestamp.
   */
  touchEngagement(state: ProximityState, key: string, currentTick: number): SpatialUpdateResult {
    return SpatialIndex.touchEngagement(state, key, currentTick);
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  /**
   * Get a summary of all proximity relationships.
   */
  getProximitySummary(state: ProximityState): {
    totalEngagements: number;
    npcsEngaged: string[];
    npcsInProximity: { npcId: string; level: ProximityLevel }[];
  } {
    const engagements = Object.values(state.engagements);
    const npcsEngaged = [...new Set(engagements.map((e) => e.npcId))];
    const npcsInProximity = Object.entries(state.npcProximity)
      .filter((entry): entry is [string, ProximityLevel] => entry[1] !== undefined)
      .map(([npcId, level]) => ({ npcId, level }));

    return {
      totalEngagements: engagements.length,
      npcsEngaged,
      npcsInProximity,
    };
  }

  /**
   * Clean up stale engagements that haven't been active recently.
   */
  cleanupStaleEngagements(
    state: ProximityState,
    currentTick: number,
    staleThresholdTicks = 10
  ): { removed: number; keys: string[] } {
    const threshold = currentTick - staleThresholdTicks;
    const engagements = state.engagements as Record<string, SensoryEngagement | undefined>;
    const keysToRemove: string[] = [];

    for (const [key, engagement] of Object.entries(engagements)) {
      if (engagement && engagement.lastActiveAt < threshold) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      // Use Reflect.deleteProperty to avoid generic object injection sink
      Reflect.deleteProperty(engagements, key);
    }

    return {
      removed: keysToRemove.length,
      keys: keysToRemove,
    };
  }
}
