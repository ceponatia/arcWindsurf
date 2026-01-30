import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FactionService } from '../src/social/faction.js';

const relationshipMap = new Map<string, number>();
const reputationMap = new Map<string, number>();

function relationshipKey(a: string, b: string): string {
  return [a, b].sort().join('::');
}

function reputationKey(sessionId: string, actorId: string, factionId: string): string {
  return `${sessionId}::${actorId}::${factionId}`;
}

vi.mock('@minimal-rpg/db', () => ({
  getFactionRelationship: vi.fn(async (factionAId: string, factionBId: string) => {
    const key = relationshipKey(factionAId, factionBId);
    return relationshipMap.get(key) ?? 0;
  }),
  setFactionRelationship: vi.fn(
    async (factionAId: string, factionBId: string, relationship: number) => {
      const key = relationshipKey(factionAId, factionBId);
      relationshipMap.set(key, relationship);
    }
  ),
  getActorReputation: vi.fn(
    async (sessionId: string, actorId: string, factionId: string) => {
      const key = reputationKey(sessionId, actorId, factionId);
      return reputationMap.get(key) ?? 0;
    }
  ),
  updateActorReputation: vi.fn(
    async (sessionId: string, actorId: string, factionId: string, delta: number) => {
      const key = reputationKey(sessionId, actorId, factionId);
      const next = Math.max(-100, Math.min(100, (reputationMap.get(key) ?? 0) + delta));
      reputationMap.set(key, next);
      return next;
    }
  ),
}));

describe('FactionService', () => {
  beforeEach(() => {
    relationshipMap.clear();
    reputationMap.clear();
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
      const newRep = await FactionService.updateReputation('session-1', 'player', 'guild', 25);
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
