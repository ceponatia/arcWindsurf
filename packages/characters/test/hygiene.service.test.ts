import { describe, expect, it, vi } from 'vitest';
import * as Schemas from '@minimal-rpg/schemas';
import type {
  BodyPartHygieneState,
  HygieneLevel,
  NpcHygieneState,
  SensoryModifiersData,
} from '@minimal-rpg/schemas';
import { HygieneService } from '../src/hygiene/service.js';
import type { HygieneModifiersProvider, HygieneRepository } from '../src/hygiene/types.js';

class InMemoryHygieneRepository implements HygieneRepository {
  constructor(private state: NpcHygieneState) {}

  readonly upserts: Array<{ bodyPart: string; state: BodyPartHygieneState }> = [];

  async getState(_sessionId: string, _npcId: string): Promise<NpcHygieneState> {
    return {
      npcId: this.state.npcId,
      bodyParts: { ...this.state.bodyParts },
    };
  }

  async upsertPart(
    _sessionId: string,
    _npcId: string,
    bodyPart: string,
    state: BodyPartHygieneState
  ): Promise<void> {
    this.state.bodyParts[bodyPart] = state;
    this.upserts.push({ bodyPart, state });
  }

  async resetParts(
    _sessionId: string,
    _npcId: string,
    bodyParts: string[],
    at: Date
  ): Promise<void> {
    for (const part of bodyParts) {
      this.state.bodyParts[part] = { points: 0, level: 0, lastUpdatedAt: at.toISOString() };
    }
  }

  async initializeAll(
    _sessionId: string,
    npcId: string,
    at: Date,
    regions: readonly string[]
  ): Promise<NpcHygieneState> {
    const bodyParts: Record<string, BodyPartHygieneState> = {};
    for (const region of regions) {
      bodyParts[region] = { points: 0, level: 0, lastUpdatedAt: at.toISOString() };
    }
    this.state = { npcId, bodyParts };
    return this.state;
  }
}

function makeModifiersProvider(data: SensoryModifiersData): HygieneModifiersProvider {
  return {
    load: async () => data,
  };
}

describe('HygieneService.update', () => {
  it('passes current hygiene level into decay calculations', async () => {
    const repository = new InMemoryHygieneRepository({
      npcId: 'npc-1',
      bodyParts: {
        armpits: {
          points: 200,
          level: 5 satisfies HygieneLevel,
          lastUpdatedAt: new Date().toISOString(),
        },
      },
    });

    const modifiers = makeModifiersProvider({
      bodyParts: {},
      decayRates: {
        armpits: {
          bodyPart: 'armpits',
          thresholds: Schemas.DEFAULT_HYGIENE_THRESHOLDS,
          baseDecayPerTurn: 10,
        },
      },
    });

    const service = new HygieneService({ repository, modifiers });
    const decaySpy = vi.spyOn(Schemas, 'calculateDecayPoints');

    const result = await service.update('session-1', {
      npcId: 'npc-1',
      turnsElapsed: 1,
      activity: 'working',
    });

    expect(decaySpy).toHaveBeenCalledWith(10, 1, 'working', undefined, undefined, false, 5);

    const part = result.state.bodyParts.armpits;
    const expectedDelta = 10 * 1 * 1.5 * Schemas.HYGIENE_DECAY_MULTIPLIERS[5];
    expect(part?.points).toBeCloseTo(200 + expectedDelta, 5);
    expect(part?.level).toBe(5);
  });
});

describe('HygieneService.applyEvent', () => {
  it('applies cleaning events and only persists changed parts', async () => {
    const repository = new InMemoryHygieneRepository({
      npcId: 'npc-2',
      bodyParts: {
        head: { points: 50, level: 3, lastUpdatedAt: new Date().toISOString() },
        torso: { points: 0, level: 0, lastUpdatedAt: new Date().toISOString() },
      },
    });

    const modifiers = makeModifiersProvider({
      bodyParts: {},
      decayRates: {
        head: {
          bodyPart: 'head',
          thresholds: Schemas.DEFAULT_HYGIENE_THRESHOLDS,
          baseDecayPerTurn: 5,
        },
      },
    });

    const service = new HygieneService({ repository, modifiers });

    const result = await service.applyEvent('session-2', 'npc-2', {
      kind: 'clean',
      event: 'quickWash',
    });

    const changedParts = repository.upserts.map((u) => u.bodyPart);
    expect(changedParts).toContain('head');
    expect(changedParts).not.toContain('feet');

    const head = result.state.bodyParts.head;
    expect(head?.level).toBe(1);
    expect(head?.points).toBe(Schemas.DEFAULT_HYGIENE_THRESHOLDS[1]);
    expect(head?.lastUpdatedAt).toBeDefined();

    const torso = result.state.bodyParts.torso;
    expect(torso?.level).toBe(0);
    expect(torso?.points).toBe(0);
  });
});

describe('HygieneService.getSensoryModifier', () => {
  it('returns the modifier for the body part and level', async () => {
    const repository = new InMemoryHygieneRepository({
      npcId: 'npc-3',
      bodyParts: {
        feet: { points: 120, level: 4, lastUpdatedAt: new Date().toISOString() },
      },
    });

    const modifiers = makeModifiersProvider({
      bodyParts: {
        feet: {
          smell: {
            '0': '',
            '1': 'fresh',
            '2': 'noticeable',
            '3': 'strong',
            '4': 'pungent',
            '5': 'overpowering',
            '6': 'putrid',
          },
        },
      },
      decayRates: {
        feet: {
          bodyPart: 'feet',
          thresholds: Schemas.DEFAULT_HYGIENE_THRESHOLDS,
          baseDecayPerTurn: 4,
        },
      },
    });

    const service = new HygieneService({ repository, modifiers });

    const result = await service.getSensoryModifier('session-3', 'npc-3', 'feet', 'smell');

    expect(result.level).toBe(4);
    expect(result.modifier).toBe('pungent');
  });
});
