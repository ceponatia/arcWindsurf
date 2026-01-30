import {
  getActorReputation,
  getFactionRelationship,
  setFactionRelationship,
  updateActorReputation,
} from '@minimal-rpg/db';
import type { FactionRelationship, ReputationLevel } from './types.js';
import { REPUTATION_LEVELS } from './types.js';

/**
 * Faction Service
 *
 * Manages faction relationships and reputations.
 */
export class FactionService {
  /**
   * Get relationship between two factions.
   * @param factionA - First faction ID
   * @param factionB - Second faction ID
   * @returns Relationship value (-100 to 100, 0 = neutral)
   */
  static async getRelationship(
    factionA: string,
    factionB: string
  ): Promise<FactionRelationship> {
    return getFactionRelationship(factionA, factionB);
  }

  /**
   * Set relationship between two factions.
   */
  static async setRelationship(
    factionA: string,
    factionB: string,
    relationship: number,
    type?: string
  ): Promise<void> {
    await setFactionRelationship(factionA, factionB, relationship, type);
  }

  /**
   * Get actor's reputation with a faction.
   * @param sessionId - Session scope
   * @param actorId - Actor ID (player or NPC)
   * @param factionId - Faction ID
   * @returns Reputation value (-100 to 100)
   */
  static async getReputation(
    sessionId: string,
    actorId: string,
    factionId: string
  ): Promise<number> {
    return getActorReputation(sessionId, actorId, factionId);
  }

  /**
   * Update reputation for an actor with a faction.
   * @param actorId - The actor whose reputation is changing
   * @param factionId - The faction the reputation is with
   * @param delta - Change in reputation (-100 to 100)
   */
  static async updateReputation(
    sessionId: string,
    actorId: string,
    factionId: string,
    delta: number
  ): Promise<number> {
    return updateActorReputation(sessionId, actorId, factionId, delta);
  }

  /**
   * Get reputation level label for a value.
   */
  static getReputationLevel(reputation: number): ReputationLevel {
    if (reputation <= REPUTATION_LEVELS.hated) return 'hated';
    if (reputation <= REPUTATION_LEVELS.unfriendly) return 'unfriendly';
    if (reputation <= REPUTATION_LEVELS.friendly) return 'neutral';
    if (reputation <= REPUTATION_LEVELS.honored) return 'friendly';
    return 'honored';
  }

  /**
   * Check if factions are hostile to each other.
   */
  static async areHostile(factionA: string, factionB: string): Promise<boolean> {
    const relationship = await this.getRelationship(factionA, factionB);
    return relationship <= -50;
  }

  /**
   * Check if factions are allied.
   */
  static async areAllied(factionA: string, factionB: string): Promise<boolean> {
    const relationship = await this.getRelationship(factionA, factionB);
    return relationship >= 50;
  }

  /**
   * Check if an actor is an enemy of a faction.
   */
  static async isEnemy(
    sessionId: string,
    actorId: string,
    factionId: string
  ): Promise<boolean> {
    const reputation = await this.getReputation(sessionId, actorId, factionId);
    return reputation <= REPUTATION_LEVELS.hated;
  }
}
