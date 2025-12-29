/**
 * Proximity Service - Thin wrapper for proximity-specific state logic.
 *
 * Provides convenience methods for manipulating proximity state,
 * generating JSON Patch operations for state updates.
 */
import { type Operation } from 'fast-json-patch';
import {
  type ProximityState,
  type SensoryEngagement,
  type ProximityAction,
  type SenseType,
  type EngagementIntensity,
  type ProximityLevel,
  ProximityStateSchema,
  makeEngagementKey,
  createDefaultProximityState,
} from '@minimal-rpg/schemas';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a proximity update operation.
 */
export interface ProximityUpdateResult {
  /** Whether the operation succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** JSON Patch operations to apply to state */
  patches: Operation[];

  /** The new or updated engagement (if applicable) */
  engagement?: SensoryEngagement;

  /** Human-readable description of what changed */
  description: string;
}

/**
 * Parameters for updating proximity.
 */
export interface UpdateProximityParams {
  npcId: string;
  bodyPart: string;
  senseType: SenseType;
  action: ProximityAction;
  newIntensity?: EngagementIntensity;
  currentTurn: number;
}

/**
 * Parameters for updating general NPC proximity level.
 */
export interface UpdateNpcProximityLevelParams {
  npcId: string;
  level: ProximityLevel;
}

// =============================================================================
// Proximity Service
// =============================================================================

/**
 * Manages proximity state operations and generates JSON Patch operations.
 */
export class ProximityService {
  /**
   * Validate a proximity state object.
   */
  validate(state: unknown): { success: boolean; data?: ProximityState; error?: string } {
    const result = ProximityStateSchema.safeParse(state);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error.message };
  }

  /**
   * Create a default empty proximity state.
   */
  createDefault(): ProximityState {
    return createDefaultProximityState();
  }

  /**
   * Update a sensory engagement and return JSON Patch operations.
   *
   * @param currentState - Current proximity state
   * @param params - Update parameters
   * @returns Result with patches to apply
   */
  updateEngagement(
    currentState: ProximityState,
    params: UpdateProximityParams
  ): ProximityUpdateResult {
    const { npcId, bodyPart, senseType, action, newIntensity, currentTurn } = params;
    const key = makeEngagementKey(npcId, bodyPart, senseType);
    const existing = currentState.engagements[key];

    switch (action) {
      case 'engage':
        return this.handleEngage(key, existing, params);

      case 'intensify':
        return this.handleIntensify(key, existing, newIntensity, currentTurn, params);

      case 'reduce':
        return this.handleReduce(key, existing, newIntensity, currentTurn);

      case 'end':
        return this.handleEnd(key, existing);

      default: {
        // TypeScript exhaustiveness check - action should never reach here
        const unknownAction: string = action as string;
        return {
          success: false,
          error: `Unknown action: ${unknownAction}`,
          patches: [],
          description: `Failed to update engagement: unknown action ${unknownAction}`,
        };
      }
    }
  }

  /**
   * Update general proximity level to an NPC.
   */
  updateNpcProximityLevel(
    currentState: ProximityState,
    params: UpdateNpcProximityLevelParams
  ): ProximityUpdateResult {
    const { npcId, level } = params;
    const currentLevel = currentState.npcProximity[npcId];

    if (currentLevel === level) {
      return {
        success: true,
        patches: [],
        description: `Proximity to ${npcId} unchanged (${level})`,
      };
    }

    const patch: Operation = currentLevel
      ? { op: 'replace', path: `/npcProximity/${npcId}`, value: level }
      : { op: 'add', path: `/npcProximity/${npcId}`, value: level };

    return {
      success: true,
      patches: [patch],
      description: `Proximity to ${npcId} changed from ${currentLevel ?? 'none'} to ${level}`,
    };
  }

  /**
   * Get all active engagements for an NPC.
   */
  getEngagementsForNpc(state: ProximityState, npcId: string): SensoryEngagement[] {
    return Object.values(state.engagements).filter((e) => e.npcId === npcId);
  }

  /**
   * Get recent engagements (within N turns).
   */
  getRecentEngagements(
    state: ProximityState,
    currentTurn: number,
    withinTurns = 3
  ): SensoryEngagement[] {
    return Object.values(state.engagements).filter(
      (e) => currentTurn - e.lastActiveAt <= withinTurns
    );
  }

  /**
   * Touch an engagement to update lastActiveAt without changing intensity.
   */
  touchEngagement(
    currentState: ProximityState,
    npcId: string,
    bodyPart: string,
    senseType: SenseType,
    currentTurn: number
  ): ProximityUpdateResult {
    const key = makeEngagementKey(npcId, bodyPart, senseType);
    const existing = currentState.engagements[key];

    if (!existing) {
      return {
        success: false,
        error: `No engagement found for ${key}`,
        patches: [],
        description: `Cannot touch non-existent engagement: ${key}`,
      };
    }

    const patch: Operation = {
      op: 'replace',
      path: `/engagements/${key}/lastActiveAt`,
      value: currentTurn,
    };

    return {
      success: true,
      patches: [patch],
      engagement: { ...existing, lastActiveAt: currentTurn },
      description: `Updated lastActiveAt for ${key}`,
    };
  }

  /**
   * End all engagements for an NPC (e.g., when NPC leaves).
   */
  endAllEngagementsForNpc(currentState: ProximityState, npcId: string): ProximityUpdateResult {
    const engagementsToEnd = Object.entries(currentState.engagements).filter(
      ([, e]) => e.npcId === npcId
    );

    if (engagementsToEnd.length === 0) {
      return {
        success: true,
        patches: [],
        description: `No engagements to end for ${npcId}`,
      };
    }

    const patches: Operation[] = engagementsToEnd.map(([key]) => ({
      op: 'remove' as const,
      path: `/engagements/${key}`,
    }));

    return {
      success: true,
      patches,
      description: `Ended ${engagementsToEnd.length} engagement(s) with ${npcId}`,
    };
  }

  // ===========================================================================
  // Private Handlers
  // ===========================================================================

  private handleEngage(
    key: string,
    existing: SensoryEngagement | undefined,
    params: UpdateProximityParams
  ): ProximityUpdateResult {
    const { npcId, bodyPart, senseType, newIntensity, currentTurn } = params;

    // If engagement already exists (e.g., created by parallel intensify), succeed silently
    if (existing) {
      return {
        success: true,
        patches: [],
        engagement: existing,
        description: `Engagement ${key} already active at ${existing.intensity}`,
      };
    }

    if (!newIntensity) {
      return {
        success: false,
        error: `newIntensity is required for 'engage' action`,
        patches: [],
        description: 'Missing newIntensity for engage action',
      };
    }

    const engagement: SensoryEngagement = {
      npcId,
      bodyPart,
      senseType,
      intensity: newIntensity,
      startedAt: currentTurn,
      lastActiveAt: currentTurn,
    };

    const patch: Operation = {
      op: 'add',
      path: `/engagements/${key}`,
      value: engagement,
    };

    return {
      success: true,
      patches: [patch],
      engagement,
      description: `Started ${newIntensity} ${senseType} engagement with ${npcId}'s ${bodyPart}`,
    };
  }

  private handleIntensify(
    key: string,
    existing: SensoryEngagement | undefined,
    newIntensity: EngagementIntensity | undefined,
    currentTurn: number,
    params?: UpdateProximityParams
  ): ProximityUpdateResult {
    if (!newIntensity) {
      return {
        success: false,
        error: `newIntensity is required for 'intensify' action`,
        patches: [],
        description: 'Missing newIntensity for intensify action',
      };
    }

    // Auto-create engagement if it doesn't exist (handles parallel tool calls)
    if (!existing) {
      if (!params) {
        return {
          success: false,
          error: `No engagement found for ${key} and no params to create one.`,
          patches: [],
          description: `Cannot intensify non-existent engagement: ${key}`,
        };
      }

      const { npcId, bodyPart, senseType } = params;
      const engagement: SensoryEngagement = {
        npcId,
        bodyPart,
        senseType,
        intensity: newIntensity,
        startedAt: currentTurn,
        lastActiveAt: currentTurn,
      };

      const patches: Operation[] = [{ op: 'add', path: `/engagements/${key}`, value: engagement }];

      return {
        success: true,
        patches,
        engagement,
        description: `Created engagement ${key} at ${newIntensity} intensity (auto-fallback from intensify)`,
      };
    }

    const intensityOrder: EngagementIntensity[] = ['casual', 'focused', 'intimate'];
    const currentIndex = intensityOrder.indexOf(existing.intensity);
    const newIndex = intensityOrder.indexOf(newIntensity);

    if (newIndex <= currentIndex) {
      // Already at or above requested intensity - succeed silently
      return {
        success: true,
        patches: [],
        engagement: existing,
        description: `Engagement ${key} already at ${existing.intensity} (requested ${newIntensity})`,
      };
    }

    const patches: Operation[] = [
      { op: 'replace', path: `/engagements/${key}/intensity`, value: newIntensity },
      { op: 'replace', path: `/engagements/${key}/lastActiveAt`, value: currentTurn },
    ];

    return {
      success: true,
      patches,
      engagement: { ...existing, intensity: newIntensity, lastActiveAt: currentTurn },
      description: `Intensified engagement ${key} from ${existing.intensity} to ${newIntensity}`,
    };
  }

  private handleReduce(
    key: string,
    existing: SensoryEngagement | undefined,
    newIntensity: EngagementIntensity | undefined,
    currentTurn: number
  ): ProximityUpdateResult {
    if (!existing) {
      return {
        success: false,
        error: `No engagement found for ${key}. Use 'engage' to start.`,
        patches: [],
        description: `Cannot reduce non-existent engagement: ${key}`,
      };
    }

    if (!newIntensity) {
      return {
        success: false,
        error: `newIntensity is required for 'reduce' action`,
        patches: [],
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
        patches: [],
        description: `Intensity ${newIntensity} is not lower than ${existing.intensity}`,
      };
    }

    const patches: Operation[] = [
      { op: 'replace', path: `/engagements/${key}/intensity`, value: newIntensity },
      { op: 'replace', path: `/engagements/${key}/lastActiveAt`, value: currentTurn },
    ];

    return {
      success: true,
      patches,
      engagement: { ...existing, intensity: newIntensity, lastActiveAt: currentTurn },
      description: `Reduced engagement ${key} from ${existing.intensity} to ${newIntensity}`,
    };
  }

  private handleEnd(key: string, existing: SensoryEngagement | undefined): ProximityUpdateResult {
    if (!existing) {
      return {
        success: true,
        patches: [],
        description: `No engagement to end for ${key}`,
      };
    }

    const patch: Operation = {
      op: 'remove',
      path: `/engagements/${key}`,
    };

    return {
      success: true,
      patches: [patch],
      description: `Ended engagement ${key}`,
    };
  }
}
