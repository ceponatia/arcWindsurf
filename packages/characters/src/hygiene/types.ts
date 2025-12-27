import type {
  BodyPartHygieneConfig,
  BodyPartHygieneState,
  BodyPartSensoryModifiers,
  HygieneUpdateInput,
  NpcHygieneState,
  SensoryModifiersData,
} from '@minimal-rpg/schemas';
import type { CharacterId, SessionId } from '../types.js';

export type HygieneDecayConfig = BodyPartHygieneConfig;

export type HygieneSenseModifiers = BodyPartSensoryModifiers;

export type HygieneSensoryModifiers = SensoryModifiersData;

export interface HygieneModifiersProvider {
  load(): Promise<HygieneSensoryModifiers>;
}

export interface HygieneRepository {
  getState(sessionId: SessionId, npcId: CharacterId): Promise<NpcHygieneState>;
  upsertPart(
    sessionId: SessionId,
    npcId: CharacterId,
    bodyPart: string,
    state: BodyPartHygieneState
  ): Promise<void>;
  resetParts(
    sessionId: SessionId,
    npcId: CharacterId,
    bodyParts: string[],
    at: Date
  ): Promise<void>;
  initializeAll(
    sessionId: SessionId,
    npcId: CharacterId,
    at: Date,
    regions: readonly string[]
  ): Promise<NpcHygieneState>;
}

export interface HygieneServiceDeps {
  repository: HygieneRepository;
  modifiers: HygieneModifiersProvider;
  now?: () => Date;
}

export interface HygieneUpdateResult {
  state: NpcHygieneState;
}

export type HygieneUpdateRequest = HygieneUpdateInput;
