/**
 * Spatial Index Service
 *
 * Core spatial logic for the simulation.
 * Handles proximity, engagement, and spatial indexing.
 */
import {
  type ProximityState,
  type SensoryEngagement,
  type EngagementIntensity,
  type ProximityLevel,
  type UpdateProximityParams as UpdateProximityParamsBase,
  makeEngagementKey,
  createDefaultProximityState,
  getRecordOptional,
  setRecord,
} from '@minimal-rpg/schemas';

// =============================================================================
// Types
// =============================================================================

/**
 * Parameters for updating proximity.
 */
export type SpatialUpdateProximityParams = UpdateProximityParamsBase & {
  currentTick: number;
};

/**
 * Result of a proximity update operation.
 */
export interface SpatialUpdateResult {
  success: boolean;
  error?: string;
  engagement?: SensoryEngagement;
  description: string;
}

/**
 * SpatialIndex
 *
 * Manages proximity state and engagement logic.
 */
export class SpatialIndex {
  /**
   * Create a default empty proximity state.
   */
  static createDefault(): ProximityState {
    return createDefaultProximityState();
  }

  /**
   * Get all active engagements for an NPC.
   */
  static getEngagementsForNpc(state: ProximityState, npcId: string): SensoryEngagement[] {
    return Object.values(state.engagements).filter((e) => e.npcId === npcId);
  }

  /**
   * Get recent engagements (within N ticks).
   */
  static getRecentEngagements(
    state: ProximityState,
    currentTick: number,
    withinTicks = 3
  ): SensoryEngagement[] {
    return Object.values(state.engagements).filter(
      (e) => currentTick - e.lastActiveAt <= withinTicks
    );
  }

  /**
   * Get general proximity level to an NPC.
   */
  static getNpcProximityLevel(state: ProximityState, npcId: string): ProximityLevel | undefined {
    const proximity = state.npcProximity as Record<string, ProximityLevel | undefined>;
    return getRecordOptional(proximity, npcId);
  }

  /**
   * Set general proximity level to an NPC.
   */
  static setNpcProximityLevel(
    state: ProximityState,
    npcId: string,
    level: ProximityLevel
  ): SpatialUpdateResult {
    const proximity = state.npcProximity as Record<string, ProximityLevel | undefined>;
    const currentLevel = getRecordOptional(proximity, npcId);
    if (currentLevel === level) {
      return {
        success: true,
        description: `Proximity to ${npcId} unchanged (${level})`,
      };
    }

    setRecord(proximity, npcId, level);
    return {
      success: true,
      description: `Proximity to ${npcId} changed from ${currentLevel ?? 'none'} to ${level}`,
    };
  }

  /**
   * Update a sensory engagement.
   */
  static updateEngagement(
    state: ProximityState,
    params: SpatialUpdateProximityParams
  ): SpatialUpdateResult {
    const { npcId, bodyPart, senseType, action, newIntensity, currentTick } = params;
    const key = makeEngagementKey(npcId, bodyPart, senseType);
    const engagements = state.engagements as Record<string, SensoryEngagement | undefined>;
    const existing = getRecordOptional(engagements, key);

    switch (action) {
      case 'engage':
        return this.handleEngage(state, key, existing, params);
      case 'intensify':
        return this.handleIntensify(state, key, existing, newIntensity, currentTick, params);
      case 'reduce':
        return this.handleReduce(state, key, existing, newIntensity, currentTick);
      case 'end':
        return this.handleEnd(state, key, existing);
      default: {
        return {
          success: false,
          error: `Unknown action: ${action as string}`,
          description: `Failed to update engagement: unknown action ${action as string}`,
        };
      }
    }
  }

  private static handleEngage(
    state: ProximityState,
    key: string,
    existing: SensoryEngagement | undefined,
    params: SpatialUpdateProximityParams
  ): SpatialUpdateResult {
    if (existing) {
      return {
        success: true,
        engagement: existing,
        description: `Engagement ${key} already active at ${existing.intensity}`,
      };
    }

    if (!params.newIntensity) {
      return {
        success: false,
        error: `newIntensity is required for 'engage' action`,
        description: 'Missing newIntensity for engage action',
      };
    }

    const engagement: SensoryEngagement = {
      npcId: params.npcId,
      bodyPart: params.bodyPart,
      senseType: params.senseType,
      intensity: params.newIntensity,
      startedAt: params.currentTick,
      lastActiveAt: params.currentTick,
    };

    const engagements = state.engagements as Record<string, SensoryEngagement | undefined>;
    setRecord(engagements, key, engagement);
    return {
      success: true,
      engagement,
      description: `Started ${params.newIntensity} ${params.senseType} engagement with ${params.npcId}'s ${params.bodyPart}`,
    };
  }

  private static handleIntensify(
    state: ProximityState,
    key: string,
    existing: SensoryEngagement | undefined,
    newIntensity: EngagementIntensity | undefined,
    currentTick: number,
    params: SpatialUpdateProximityParams
  ): SpatialUpdateResult {
    if (!newIntensity) {
      return {
        success: false,
        error: `newIntensity is required for 'intensify' action`,
        description: 'Missing newIntensity for intensify action',
      };
    }

    const engagements = state.engagements as Record<string, SensoryEngagement | undefined>;
    if (!existing) {
      const engagement: SensoryEngagement = {
        npcId: params.npcId,
        bodyPart: params.bodyPart,
        senseType: params.senseType,
        intensity: newIntensity,
        startedAt: currentTick,
        lastActiveAt: currentTick,
      };
      setRecord(engagements, key, engagement);
      return {
        success: true,
        engagement,
        description: `Created engagement ${key} at ${newIntensity} intensity (auto-fallback from intensify)`,
      };
    }

    const intensityOrder: EngagementIntensity[] = ['casual', 'focused', 'intimate'];
    const currentIndex = intensityOrder.indexOf(existing.intensity);
    const newIndex = intensityOrder.indexOf(newIntensity);

    if (newIndex <= currentIndex) {
      return {
        success: true,
        engagement: existing,
        description: `Engagement ${key} already at ${existing.intensity} (requested ${newIntensity})`,
      };
    }

    existing.intensity = newIntensity;
    existing.lastActiveAt = currentTick;
    return {
      success: true,
      engagement: existing,
      description: `Intensified engagement ${key} from ${existing.intensity} to ${newIntensity}`,
    };
  }

  private static handleReduce(
    state: ProximityState,
    key: string,
    existing: SensoryEngagement | undefined,
    newIntensity: EngagementIntensity | undefined,
    currentTick: number
  ): SpatialUpdateResult {
    if (!existing) {
      return {
        success: false,
        error: `No engagement found for ${key}`,
        description: `Cannot reduce non-existent engagement: ${key}`,
      };
    }

    if (!newIntensity) {
      return {
        success: false,
        error: `newIntensity is required for 'reduce' action`,
        description: 'Missing newIntensity for reduce action',
      };
    }

    const intensityOrder: EngagementIntensity[] = ['casual', 'focused', 'intimate'];
    const currentIndex = intensityOrder.indexOf(existing.intensity);
    const newIndex = intensityOrder.indexOf(newIntensity);

    if (newIndex >= currentIndex) {
      return {
        success: false,
        error: `Cannot reduce from ${existing.intensity} to ${newIntensity}`,
        description: `Intensity ${newIntensity} is not lower than ${existing.intensity}`,
      };
    }

    existing.intensity = newIntensity;
    existing.lastActiveAt = currentTick;
    return {
      success: true,
      engagement: existing,
      description: `Reduced engagement ${key} from ${existing.intensity} to ${newIntensity}`,
    };
  }

  private static handleEnd(
    state: ProximityState,
    key: string,
    existing: SensoryEngagement | undefined
  ): SpatialUpdateResult {
    if (!existing) {
      return {
        success: true,
        description: `No engagement to end for ${key}`,
      };
    }

    const engagements = state.engagements as Record<string, SensoryEngagement | undefined>;
    Reflect.deleteProperty(engagements, key);
    return {
      success: true,
      description: `Ended engagement ${key}`,
    };
  }

  /**
   * Touch an engagement to update lastActiveAt.
   */
  static touchEngagement(
    state: ProximityState,
    key: string,
    currentTick: number
  ): SpatialUpdateResult {
    const engagements = state.engagements as Record<string, SensoryEngagement | undefined>;
    const existing = getRecordOptional(engagements, key);
    if (!existing) {
      return {
        success: false,
        error: `No engagement found for ${key}`,
        description: `Cannot touch non-existent engagement: ${key}`,
      };
    }

    existing.lastActiveAt = currentTick;
    return {
      success: true,
      engagement: existing,
      description: `Updated lastActiveAt for ${key}`,
    };
  }

  /**
   * End all engagements for an NPC.
   */
  static endAllEngagementsForNpc(state: ProximityState, npcId: string): SpatialUpdateResult {
    const engagements = state.engagements as Record<string, SensoryEngagement | undefined>;
    const keys = Object.keys(engagements);
    const count = keys.length;
    for (const key of keys) {
      const engagement = getRecordOptional(engagements, key);
      if (engagement?.npcId === npcId) {
        Reflect.deleteProperty(engagements, key);
      }
    }
    const newCount = Object.keys(engagements).length;
    const removed = count - newCount;

    return {
      success: true,
      description: `Ended ${removed} engagement(s) with ${npcId}`,
    };
  }
}
