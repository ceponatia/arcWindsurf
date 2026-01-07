/**
 * Faction relationship value.
 * Negative = hostile, 0 = neutral, positive = friendly.
 * Range: -100 to 100
 */
export type FactionRelationship = number;

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
  static getRelationship(factionA: string, factionB: string): FactionRelationship {
    // TODO: Implement faction relationship lookup from state/db
    // For now, log and return neutral
    console.debug(`[FactionService] Getting relationship between ${factionA} and ${factionB}`);
    return 0; // Neutral
  }

  /**
   * Update reputation for an actor with a faction.
   * @param actorId - The actor whose reputation is changing
   * @param factionId - The faction the reputation is with
   * @param delta - Change in reputation (-100 to 100)
   */
  static updateReputation(actorId: string, factionId: string, delta: number): void {
    // TODO: Implement reputation persistence
    console.debug(
      `[FactionService] Updating reputation for ${actorId} with ${factionId} by ${delta}`
    );
  }
}
