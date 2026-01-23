import type { BodyPartHygieneState, NpcHygieneState } from '@minimal-rpg/schemas';
import { getRecordOptional, setRecord } from '@minimal-rpg/schemas';
import type { HygieneRepository } from './types.js';
import type { CharacterId, SessionId } from '../types.js';

interface ActorStateRow {
  actorType: string;
  actorId: string;
  entityProfileId: string | null;
  state: unknown;
  lastEventSeq: bigint;
}

interface ActorStateStore {
  getActorState: (sessionId: SessionId, actorId: CharacterId) => Promise<ActorStateRow | undefined>;
  upsertActorState: (input: {
    sessionId: SessionId;
    actorType: string;
    actorId: CharacterId;
    entityProfileId: string | null;
    state: Record<string, unknown>;
    lastEventSeq: bigint;
  }) => Promise<unknown>;
}

interface HygieneActorState {
  hygiene?: Record<string, BodyPartHygieneState>;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getHygieneFromState(state: unknown): Record<string, BodyPartHygieneState> {
  if (!isRecord(state)) return {};
  const maybe = getRecordOptional(state, 'hygiene');
  if (!isRecord(maybe)) return {};
  return maybe as Record<string, BodyPartHygieneState>;
}

function setHygieneOnState(state: unknown, hygiene: Record<string, BodyPartHygieneState>): HygieneActorState {
  const base = isRecord(state) ? (state as HygieneActorState) : ({} as HygieneActorState);
  return { ...base, hygiene };
}

/**
 * Hygiene repository backed by `actor_states.state.hygiene`.
 */
export class ActorStateHygieneRepository implements HygieneRepository {
  constructor(private readonly store: ActorStateStore) {}

  async getState(sessionId: SessionId, npcId: CharacterId): Promise<NpcHygieneState> {
    const actorState = await this.store.getActorState(sessionId, npcId);
    if (!actorState) {
      return { npcId, bodyParts: {} };
    }

    return {
      npcId,
      bodyParts: getHygieneFromState(actorState.state),
    };
  }

  async upsertPart(
    sessionId: SessionId,
    npcId: CharacterId,
    bodyPart: string,
    state: BodyPartHygieneState
  ): Promise<void> {
    const actorState = await this.store.getActorState(sessionId, npcId);

    const prevHygiene = actorState ? getHygieneFromState(actorState.state) : {};
    const nextHygiene: Record<string, BodyPartHygieneState> = { ...prevHygiene };
    setRecord(nextHygiene, bodyPart, state);

    await this.store.upsertActorState({
      sessionId,
      actorType: actorState?.actorType ?? 'npc',
      actorId: npcId,
      entityProfileId: actorState?.entityProfileId ?? null,
      state: setHygieneOnState(actorState?.state, nextHygiene),
      lastEventSeq: actorState?.lastEventSeq ?? 0n,
    });
  }

  async resetParts(
    sessionId: SessionId,
    npcId: CharacterId,
    bodyParts: string[],
    at: Date
  ): Promise<void> {
    const actorState = await this.store.getActorState(sessionId, npcId);

    const prevHygiene = actorState ? getHygieneFromState(actorState.state) : {};
    const nextHygiene: Record<string, BodyPartHygieneState> = { ...prevHygiene };

    for (const bodyPart of bodyParts) {
      setRecord(nextHygiene, bodyPart, {
        points: 0,
        level: 0,
        lastUpdatedAt: at.toISOString(),
      });
    }

    await this.store.upsertActorState({
      sessionId,
      actorType: actorState?.actorType ?? 'npc',
      actorId: npcId,
      entityProfileId: actorState?.entityProfileId ?? null,
      state: setHygieneOnState(actorState?.state, nextHygiene),
      lastEventSeq: actorState?.lastEventSeq ?? 0n,
    });
  }

  async initializeAll(
    sessionId: SessionId,
    npcId: CharacterId,
    at: Date,
    regions: readonly string[]
  ): Promise<NpcHygieneState> {
    const actorState = await this.store.getActorState(sessionId, npcId);

    const prevHygiene = actorState ? getHygieneFromState(actorState.state) : {};
    const nextHygiene: Record<string, BodyPartHygieneState> = { ...prevHygiene };

    for (const region of regions) {
      if (getRecordOptional(nextHygiene, region)) {
        continue;
      }

      setRecord(nextHygiene, region, {
        points: 0,
        level: 0,
        lastUpdatedAt: at.toISOString(),
      });
    }

    await this.store.upsertActorState({
      sessionId,
      actorType: actorState?.actorType ?? 'npc',
      actorId: npcId,
      entityProfileId: actorState?.entityProfileId ?? null,
      state: setHygieneOnState(actorState?.state, nextHygiene),
      lastEventSeq: actorState?.lastEventSeq ?? 0n,
    });

    return { npcId, bodyParts: nextHygiene };
  }
}
