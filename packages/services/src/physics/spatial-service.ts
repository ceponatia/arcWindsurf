/**
 * Spatial Service
 *
 * Core spatial logic for the simulation.
 * Handles proximity, engagement, and spatial indexing.
 */
import {
  type ProximityState,
  type SensoryEngagement,
  type EngagementIntensity,
  type ProximityLevel,
  createDefaultProximityState,
} from '@minimal-rpg/schemas';

export interface SpatialEngagementResult {
  npcId: string;
  intensity: EngagementIntensity;
  description: string;
}

export class SpatialService {
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
   * Update general proximity level to an NPC.
   */
  static getNpcProximityLevel(state: ProximityState, npcId: string): ProximityLevel | undefined {
    return state.npcProximity[npcId];
  }

  /**
   * Set general proximity level to an NPC.
   * Returns a description of the change.
   */
  static setNpcProximityLevel(
    state: ProximityState,
    npcId: string,
    level: ProximityLevel
  ): string {
    const currentLevel = state.npcProximity[npcId];
    state.npcProximity[npcId] = level;
    return `Proximity to ${npcId} changed from ${currentLevel ?? 'none'} to ${level}`;
  }
}
