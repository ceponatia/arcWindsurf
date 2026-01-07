import { drizzle as db } from '../connection/index.js';
import { actorStates } from '../schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import type { UUID } from '../types.js';

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

export async function listActorStatesForSession(sessionId: UUID) {
  return await db.select().from(actorStates).where(eq(actorStates.sessionId, sessionId));
}

export async function deleteActorState(sessionId: UUID, actorId: string) {
  await db
    .delete(actorStates)
    .where(and(eq(actorStates.sessionId, sessionId), eq(actorStates.actorId, actorId)));
}
