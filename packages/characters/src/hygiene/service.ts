import {
  BODY_REGIONS,
  calculateDecayPoints,
  calculateHygieneLevel,
  getSensoryModifierByLevel,
  isFootRelatedPart,
  type HygieneLevel,
} from '@minimal-rpg/schemas';
import type { HygieneServiceDeps, HygieneUpdateRequest, HygieneUpdateResult } from './types.js';
import type { BodyPartHygieneState, NpcHygieneState } from '@minimal-rpg/schemas';

export class HygieneService {
  private readonly repository: HygieneServiceDeps['repository'];
  private readonly modifiers: HygieneServiceDeps['modifiers'];
  private readonly now: () => Date;

  constructor(deps: HygieneServiceDeps) {
    this.repository = deps.repository;
    this.modifiers = deps.modifiers;
    this.now = deps.now ?? (() => new Date());
  }

  async getState(sessionId: string, npcId: string): Promise<NpcHygieneState> {
    return this.repository.getState(sessionId, npcId);
  }

  async initialize(sessionId: string, npcId: string): Promise<NpcHygieneState> {
    const at = this.now();
    return this.repository.initializeAll(sessionId, npcId, at, BODY_REGIONS);
  }

  async cleanParts(
    sessionId: string,
    npcId: string,
    bodyParts: string[]
  ): Promise<NpcHygieneState> {
    const at = this.now();
    await this.repository.resetParts(sessionId, npcId, bodyParts, at);
    const state = await this.repository.getState(sessionId, npcId);

    for (const part of bodyParts) {
      state.bodyParts[part] = {
        points: 0,
        level: 0,
        lastUpdatedAt: at.toISOString(),
      } satisfies BodyPartHygieneState;
    }

    return state;
  }

  async update(sessionId: string, input: HygieneUpdateRequest): Promise<HygieneUpdateResult> {
    const modifiers = await this.modifiers.load();
    const at = this.now();

    let state = await this.repository.getState(sessionId, input.npcId);
    if (Object.keys(state.bodyParts).length === 0) {
      state = await this.initialize(sessionId, input.npcId);
    }

    if (input.cleanedParts?.length) {
      state = await this.cleanParts(sessionId, input.npcId, input.cleanedParts);
    }

    for (const region of BODY_REGIONS) {
      if (input.cleanedParts?.includes(region)) {
        continue;
      }

      const config = modifiers.decayRates[region];
      if (!config) {
        continue;
      }

      const current = state.bodyParts[region] ?? { points: 0, level: 0 };

      const decayPoints = calculateDecayPoints(
        config.baseDecayPerTurn,
        input.turnsElapsed,
        input.activity,
        input.footwear,
        input.environment,
        isFootRelatedPart(region)
      );

      const points = current.points + decayPoints;
      const level = calculateHygieneLevel(points, config.thresholds);

      const nextPart: BodyPartHygieneState = {
        points,
        level,
        lastUpdatedAt: at.toISOString(),
      };

      await this.repository.upsertPart(sessionId, input.npcId, region, nextPart);
      state.bodyParts[region] = nextPart;
    }

    return { state };
  }

  async getSensoryModifier(
    sessionId: string,
    npcId: string,
    bodyPart: string,
    senseType: 'smell' | 'touch' | 'taste'
  ): Promise<{ level: HygieneLevel; modifier: string }> {
    const modifiers = await this.modifiers.load();
    const state = await this.repository.getState(sessionId, npcId);
    const partState = state.bodyParts[bodyPart];
    const level = (partState?.level ?? 0) as HygieneLevel;

    const partModifiers = modifiers.bodyParts[bodyPart];
    const senseModifiers = partModifiers?.[senseType];
    const modifier = senseModifiers ? getSensoryModifierByLevel(senseModifiers, level) : '';

    return { level, modifier };
  }
}
