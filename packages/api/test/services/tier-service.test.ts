import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getInterestScore,
  getAllInterestScores,
  processTurnInterest,
  executePromotion,
  getNpcsReadyForPromotion,
} from '../../src/services/tier-service.js';
import type { PlayerInterestScore } from '@minimal-rpg/schemas';
import { DEFAULT_INTEREST_CONFIG } from '@minimal-rpg/schemas';
import { getActorState, listActorStatesForSession, upsertActorState } from '@minimal-rpg/db/node';

vi.mock('@minimal-rpg/db/node', () => ({
  getActorState: vi.fn(),
  listActorStatesForSession: vi.fn(),
  upsertActorState: vi.fn(),
}));

// Mock schemas functions to control behavior if needed

describe('services/tier-service', () => {
  const ownerEmail = 'test@example.com';
  const sessionId = 'session-1';
  const npcId = 'npc-1';

  const mockInterest: PlayerInterestScore = {
    npcId,
    score: 50,
    totalInteractions: 5,
    turnsSinceInteraction: 2,
    peakScore: 60,
  };

  const baseNpcActorState = {
    role: 'background',
    tier: 'background',
    name: 'Test NPC',
    status: 'active',
  } as const;

  function mockNpcActorRow(
    overrides: Partial<{ actorId: string; state: unknown; lastEventSeq: number }>
  ): {
    actorType: 'npc';
    actorId: string;
    entityProfileId: string | null;
    state: unknown;
    lastEventSeq: number;
  } {
    return {
      actorType: 'npc',
      actorId: overrides.actorId ?? npcId,
      entityProfileId: null,
      state: overrides.state ?? baseNpcActorState,
      lastEventSeq: overrides.lastEventSeq ?? 0,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInterestScore', () => {
    it('should return score when record exists', async () => {
      vi.mocked(getActorState).mockResolvedValue(
        mockNpcActorRow({ state: { ...baseNpcActorState, interest: mockInterest } }) as any
      );

      const result = await getInterestScore(ownerEmail, sessionId, npcId);

      expect(result).toEqual(mockInterest);
      expect(getActorState).toHaveBeenCalledWith(sessionId, npcId);
    });

    it('should return null when record does not exist', async () => {
      vi.mocked(getActorState).mockResolvedValue(null as any);

      const result = await getInterestScore(ownerEmail, sessionId, npcId);

      expect(result).toBeNull();
    });
  });

  describe('getAllInterestScores', () => {
    it('should return map of scores', async () => {
      vi.mocked(listActorStatesForSession).mockResolvedValue([
        mockNpcActorRow({ state: { ...baseNpcActorState, interest: mockInterest } }) as any,
        mockNpcActorRow({
          actorId: 'npc-2',
          state: {
            ...baseNpcActorState,
            interest: { ...mockInterest, npcId: 'npc-2', score: 30 },
          },
        }) as any,
        // Non-NPC should be ignored
        {
          actorType: 'player',
          actorId: 'player-1',
          entityProfileId: null,
          state: { profile: {}, status: 'active' },
          lastEventSeq: 0,
        } as any,
      ]);

      const result = await getAllInterestScores(ownerEmail, sessionId);

      expect(result.size).toBe(2);
      expect(result.get(npcId)).toEqual({
        npcId,
        score: 50,
        totalInteractions: 5,
        turnsSinceInteraction: 2,
        peakScore: 60,
      });
      expect(result.get('npc-2')?.score).toBe(30);
    });
  });

  describe('processTurnInterest', () => {
    it('should update scores for interacted NPCs', async () => {
      vi.mocked(listActorStatesForSession).mockResolvedValue([
        mockNpcActorRow({ state: { ...baseNpcActorState, interest: mockInterest } }) as any,
      ]);

      const options = {
        ownerEmail,
        sessionId,
        interactedNpcIds: [npcId],
        allNpcIds: [npcId],
      };

      const result = await processTurnInterest(options);

      expect(upsertActorState).toHaveBeenCalled();
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0]?.npcId).toBe(npcId);
      // Score should increase due to interaction
      expect(result.updated[0]?.newScore).toBeGreaterThan(mockInterest.score);
    });

    it('should apply bleed to non-interacted NPCs', async () => {
      vi.mocked(listActorStatesForSession).mockResolvedValue([
        mockNpcActorRow({ state: { ...baseNpcActorState, interest: mockInterest } }) as any,
      ]);

      const options = {
        ownerEmail,
        sessionId,
        interactedNpcIds: [],
        allNpcIds: [npcId],
      };

      const result = await processTurnInterest(options);

      expect(upsertActorState).toHaveBeenCalled();
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0]?.npcId).toBe(npcId);
      // Default config bleeds at 5% per turn
      expect(result.updated[0]?.newScore).toBeLessThan(mockInterest.score);
    });

    it('should create new scores for new NPCs', async () => {
      // Actor exists, but has no interest score yet.
      vi.mocked(listActorStatesForSession).mockResolvedValue([
        mockNpcActorRow({ state: { ...baseNpcActorState } }) as any,
      ]);

      const options = {
        ownerEmail,
        sessionId,
        interactedNpcIds: [npcId],
        allNpcIds: [npcId],
      };

      const result = await processTurnInterest(options);

      expect(upsertActorState).toHaveBeenCalled();
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0]?.npcId).toBe(npcId);
      const callArg = vi.mocked(upsertActorState).mock.calls[0]?.[0] as { state?: unknown } | undefined;
      const state = (callArg?.state ?? {}) as { interest?: PlayerInterestScore };
      expect(state.interest?.npcId).toBe(npcId);
    });
  });

  describe('executePromotion', () => {
    it('should update NPC tier', async () => {
      vi.mocked(getActorState).mockResolvedValue(
        mockNpcActorRow({ state: { ...baseNpcActorState, tier: 'background', interest: mockInterest } }) as any
      );

      await executePromotion(ownerEmail, sessionId, npcId, 'minor');

      expect(upsertActorState).toHaveBeenCalled();
      const callArg = vi.mocked(upsertActorState).mock.calls[0]?.[0] as { state?: unknown } | undefined;
      const state = (callArg?.state ?? {}) as { tier?: string };
      expect(state.tier).toBe('minor');
    });
  });

  describe('getNpcsReadyForPromotion', () => {
    it('should return NPCs that meet promotion criteria', async () => {
      vi.mocked(listActorStatesForSession).mockResolvedValue([
        mockNpcActorRow({
          state: {
            ...baseNpcActorState,
            tier: 'background',
            interest: {
              ...mockInterest,
              score: DEFAULT_INTEREST_CONFIG.promotionThresholds.backgroundToMinor + 10,
            },
          },
        }) as any,
      ]);

      const result = await getNpcsReadyForPromotion(ownerEmail, sessionId);

      expect(result).toHaveLength(1);
      expect(result[0]?.shouldPromote).toBe(true);
      expect(result[0]?.targetTier).toBe('minor');
    });
  });
});
