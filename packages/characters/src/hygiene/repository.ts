import {
  type BodyPartHygieneState,
  type HygieneLevel,
  type NpcHygieneRow,
  type NpcHygieneState,
  setRecord,
} from '@minimal-rpg/schemas';
import type { HygieneRepository } from './types.js';

interface HygieneDb {
  npcHygieneState: {
    findMany: (args: {
      where?: { sessionId?: string; npcId?: string };
    }) => Promise<NpcHygieneRow[]>;
    upsert: (args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
      create: {
        sessionId: string;
        npcId: string;
        bodyPart: string;
        points: number;
        level: number;
        lastUpdatedAt?: Date;
      };
      update: { points?: number; level?: number; lastUpdatedAt?: Date };
    }) => Promise<unknown>;
    reset?: (args: {
      sessionId: string;
      npcId: string;
      bodyPart: string;
      at: Date;
    }) => Promise<void>;
    update?: (args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
      data: { points?: number; level?: number; lastUpdatedAt?: Date };
    }) => Promise<unknown>;
  };
}

function toPartState(row: NpcHygieneRow): BodyPartHygieneState {
  return {
    points: row.points,
    level: row.level as HygieneLevel,
    lastUpdatedAt: row.lastUpdatedAt ? row.lastUpdatedAt.toISOString() : undefined,
  };
}

export class DbHygieneRepository implements HygieneRepository {
  constructor(private readonly db: HygieneDb) { }

  async getState(sessionId: string, npcId: string): Promise<NpcHygieneState> {
    const rows = await this.db.npcHygieneState.findMany({ where: { sessionId, npcId } });
    const bodyParts: Record<string, BodyPartHygieneState> = {};
    for (const row of rows) {
      setRecord(bodyParts, row.bodyPart, toPartState(row));
    }
    return { npcId, bodyParts };
  }

  async upsertPart(
    sessionId: string,
    npcId: string,
    bodyPart: string,
    state: BodyPartHygieneState
  ): Promise<void> {
    const lastUpdatedAt = state.lastUpdatedAt ? new Date(state.lastUpdatedAt) : undefined;

    await this.db.npcHygieneState.upsert({
      where: { sessionId_npcId_bodyPart: { sessionId, npcId, bodyPart } },
      create: {
        sessionId,
        npcId,
        bodyPart,
        points: state.points,
        level: state.level,
        ...(lastUpdatedAt ? { lastUpdatedAt } : {}),
      },
      update: {
        points: state.points,
        level: state.level,
        ...(lastUpdatedAt ? { lastUpdatedAt } : {}),
      },
    });
  }

  async resetParts(sessionId: string, npcId: string, bodyParts: string[], at: Date): Promise<void> {
    for (const part of bodyParts) {
      await this.db.npcHygieneState.upsert({
        where: { sessionId_npcId_bodyPart: { sessionId, npcId, bodyPart: part } },
        create: {
          sessionId,
          npcId,
          bodyPart: part,
          points: 0,
          level: 0,
          lastUpdatedAt: at,
        },
        update: {
          points: 0,
          level: 0,
          lastUpdatedAt: at,
        },
      });
    }
  }

  async initializeAll(
    sessionId: string,
    npcId: string,
    at: Date,
    regions: readonly string[]
  ): Promise<NpcHygieneState> {
    const bodyParts: Record<string, BodyPartHygieneState> = {};

    for (const region of regions) {
      await this.db.npcHygieneState.upsert({
        where: { sessionId_npcId_bodyPart: { sessionId, npcId, bodyPart: region } },
        create: {
          sessionId,
          npcId,
          bodyPart: region,
          points: 0,
          level: 0,
          lastUpdatedAt: at,
        },
        update: {},
      });

      setRecord(bodyParts, region, {
        points: 0,
        level: 0,
        lastUpdatedAt: at.toISOString(),
      });
    }

    return { npcId, bodyParts };
  }
}
