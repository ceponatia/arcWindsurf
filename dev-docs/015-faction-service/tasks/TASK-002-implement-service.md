# TASK-002: Implement FactionService Methods

**Priority**: P1
**Status**: ✅ Complete
**Estimate**: 3-4 hours
**Depends On**: TASK-001 (DB tables)
**Category**: Faction Service

---

## Objective

Replace placeholder FactionService methods with real implementations using the database tables.

## Current Code

```typescript
// packages/services/src/social/faction.ts
static getRelationship(factionA: string, factionB: string): FactionRelationship {
  // TODO: Implement faction relationship lookup from state/db
  console.debug(`[FactionService] Getting relationship between ${factionA} and ${factionB}`);
  return 0; // Neutral
}

static updateReputation(actorId: string, factionId: string, delta: number): void {
  // TODO: Implement reputation persistence
  console.debug(`[FactionService] Updating reputation for ${actorId} with ${factionId} by ${delta}`);
}
```

## Target Implementation

```typescript
import {
  getFactionRelationship,
  setFactionRelationship,
  getActorReputation,
  updateActorReputation,
} from '@minimal-rpg/db';

/**
 * Faction relationship value.
 * Negative = hostile, 0 = neutral, positive = friendly.
 * Range: -100 to 100
 */
export type FactionRelationship = number;

/**
 * Reputation level thresholds.
 */
export const REPUTATION_LEVELS = {
  hated: -80,
  unfriendly: -40,
  neutral: 0,
  friendly: 40,
  honored: 80,
} as const;

export type ReputationLevel = keyof typeof REPUTATION_LEVELS;

/**
 * Faction Service
 *
 * Manages faction relationships and actor reputations.
 */
export class FactionService {
  /**
   * Get relationship between two factions.
   * @param factionA - First faction ID
   * @param factionB - Second faction ID
   * @returns Relationship value (-100 to 100, 0 = neutral)
   */
  static async getRelationship(factionA: string, factionB: string): Promise<FactionRelationship> {
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
   * @param sessionId - Session scope
   * @param actorId - The actor whose reputation is changing
   * @param factionId - The faction the reputation is with
   * @param delta - Change in reputation
   * @returns New reputation value
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
```

## Signature Changes

Note: Methods are now **async** and require **sessionId** for reputation operations. This is a breaking change from the placeholder.

Update call sites to:

```typescript
// Before (sync)
const rel = FactionService.getRelationship('guild', 'crown');

// After (async)
const rel = await FactionService.getRelationship('guild', 'crown');
```

## Testing

```typescript
describe('FactionService', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  describe('getRelationship', () => {
    it('should return 0 for unknown factions', async () => {
      const rel = await FactionService.getRelationship('unknown-a', 'unknown-b');
      expect(rel).toBe(0);
    });

    it('should return relationship in either direction', async () => {
      await FactionService.setRelationship('guild', 'crown', 75, 'allied');

      expect(await FactionService.getRelationship('guild', 'crown')).toBe(75);
      expect(await FactionService.getRelationship('crown', 'guild')).toBe(75);
    });
  });

  describe('updateReputation', () => {
    it('should start at 0 and add delta', async () => {
      const newRep = await FactionService.updateReputation(
        'session-1',
        'player',
        'guild',
        25
      );
      expect(newRep).toBe(25);
    });

    it('should clamp to -100 to 100', async () => {
      await FactionService.updateReputation('session-1', 'player', 'guild', 200);
      const rep = await FactionService.getReputation('session-1', 'player', 'guild');
      expect(rep).toBe(100);
    });
  });

  describe('areHostile', () => {
    it('should return true when relationship <= -50', async () => {
      await FactionService.setRelationship('rebels', 'empire', -75);
      expect(await FactionService.areHostile('rebels', 'empire')).toBe(true);
    });
  });
});
```

## Acceptance Criteria

- [x] `getRelationship` returns DB value or 0
- [x] `setRelationship` persists to DB
- [x] `getReputation` returns session-scoped value
- [x] `updateReputation` adds delta and clamps
- [x] Helper methods work correctly (`areHostile`, `areAllied`, `isEnemy`, `getReputationLevel`)
- [x] All methods are async
- [x] Unit tests pass (5/5 in `packages/services/test/faction.test.ts`)

## Notes

- Consider emitting events on reputation changes for WorldBus
- May need to update DialogueService to check reputation
