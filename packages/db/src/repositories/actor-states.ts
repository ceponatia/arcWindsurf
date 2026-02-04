import { drizzle as db } from '../connection/index.js';
import { actorStates } from '../schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import {
  getRecordOptional,
  NpcScheduleSchema,
  type NpcSchedule,
  type NpcScheduleRef,
} from '@minimal-rpg/schemas';
import type { UUID } from '../types.js';

type ActorStateRecord = Record<string, unknown>;

/**
 * Check if a value is a plain record.
 */
function isRecord(value: unknown): value is ActorStateRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Convert unknown input into a record of strings if possible.
 */
function toStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      Object.defineProperty(result, key, {
        value: entry,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Safely read a nested record from an actor state object.
 */
function getActorStateRecord(
  record: ActorStateRecord | undefined,
  key: string
): ActorStateRecord | undefined {
  const value = getRecordOptional(record, key);
  return isRecord(value) ? value : undefined;
}

/**
 * Safely read a string field from an actor state object.
 */
function getActorStateString(
  record: ActorStateRecord | undefined,
  key: string
): string | undefined {
  const value = getRecordOptional(record, key);
  return typeof value === 'string' ? value : undefined;
}

export interface UpsertActorStateInput {
  sessionId: UUID;
  actorType: string;
  actorId: string;
  entityProfileId?: UUID | null;
  state: Record<string, unknown>;
  lastEventSeq: bigint;
}

export async function upsertActorState(input: UpsertActorStateInput) {
  const [result] = await db
    .insert(actorStates)
    .values({
      sessionId: input.sessionId,
      actorType: input.actorType,
      actorId: input.actorId,
      entityProfileId: input.entityProfileId,
      state: input.state,
      lastEventSeq: input.lastEventSeq,
    })
    .onConflictDoUpdate({
      target: [actorStates.sessionId, actorStates.actorId],
      set: {
        state: input.state,
        lastEventSeq: input.lastEventSeq,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

export async function bulkUpsertActorStates(inputs: UpsertActorStateInput[]) {
  if (inputs.length === 0) return [];

  return await db
    .insert(actorStates)
    .values(
      inputs.map((input) => ({
        sessionId: input.sessionId,
        actorType: input.actorType,
        actorId: input.actorId,
        entityProfileId: input.entityProfileId,
        state: input.state,
        lastEventSeq: input.lastEventSeq,
      }))
    )
    .onConflictDoUpdate({
      target: [actorStates.sessionId, actorStates.actorId],
      set: {
        state: sql`excluded.state`,
        lastEventSeq: sql`excluded.last_event_seq`,
        updatedAt: new Date(),
      },
    })
    .returning();
}

export async function getActorState(sessionId: UUID, actorId: string) {
  const [result] = await db
    .select()
    .from(actorStates)
    .where(and(eq(actorStates.sessionId, sessionId), eq(actorStates.actorId, actorId)))
    .limit(1);
  return result;
}

/**
 * Update actor state JSON with a shallow merge of provided fields.
 */
export async function updateActorState(
  sessionId: UUID,
  actorId: string,
  updates: ActorStateRecord
) {
  const current = await getActorState(sessionId, actorId);
  if (!current) return null;

  const currentState = isRecord(current.state) ? current.state : {};
  const nextState = {
    ...currentState,
    ...updates,
  };

  const [result] = await db
    .update(actorStates)
    .set({
      state: nextState,
      updatedAt: new Date(),
    })
    .where(and(eq(actorStates.sessionId, sessionId), eq(actorStates.actorId, actorId)))
    .returning();

  return result ?? null;
}

export async function listActorStatesForSession(sessionId: UUID) {
  return await db.select().from(actorStates).where(eq(actorStates.sessionId, sessionId));
}

/**
 * Fetch all NPC actors for a session and extract schedule data.
 */
export async function getSessionNpcsWithSchedules(
  sessionId: UUID
): Promise<
  {
    npcId: string;
    schedule?: NpcSchedule;
    scheduleRef?: NpcScheduleRef;
    homeLocationId?: string;
    workLocationId?: string;
  }[]
> {
  const actors = await db
    .select()
    .from(actorStates)
    .where(and(eq(actorStates.sessionId, sessionId), eq(actorStates.actorType, 'npc')));

  return actors
    .map((actor) => {
      const state = isRecord(actor.state) ? actor.state : undefined;
      const scheduleState = getActorStateRecord(state, 'schedule');

      const scheduleDataResult = NpcScheduleSchema.safeParse(
        getRecordOptional(scheduleState, 'scheduleData')
      );
      const scheduleData: NpcSchedule | undefined = scheduleDataResult.success
        ? scheduleDataResult.data
        : undefined;
      const templateId = getActorStateString(scheduleState, 'templateId');
      const placeholderMappings = toStringRecord(
        getRecordOptional(scheduleState, 'placeholderMappings')
      );

      const scheduleRef =
        templateId && placeholderMappings
          ? ({ templateId, placeholders: placeholderMappings } satisfies NpcScheduleRef)
          : undefined;

      const homeLocationId = getActorStateString(state, 'homeLocationId');
      const workLocationId = getActorStateString(state, 'workLocationId');

      return {
        npcId: actor.actorId,
        ...(scheduleData ? { schedule: scheduleData } : {}),
        ...(scheduleRef ? { scheduleRef } : {}),
        ...(homeLocationId ? { homeLocationId } : {}),
        ...(workLocationId ? { workLocationId } : {}),
      };
    })
    .filter((npc) => (npc.schedule ?? npc.scheduleRef) !== undefined);
}

export async function deleteActorState(sessionId: UUID, actorId: string) {
  await db
    .delete(actorStates)
    .where(and(eq(actorStates.sessionId, sessionId), eq(actorStates.actorId, actorId)));
}
