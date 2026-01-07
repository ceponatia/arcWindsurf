import { eq, and, gte, asc } from 'drizzle-orm';
import { drizzle } from '../connection/drizzle.js';
import { events } from '../schema/index.js';
import { type WorldEvent } from '@minimal-rpg/schemas';
import type { UUID } from '../types.js';

export interface SaveEventInput {
  sessionId: UUID;
  sequence: bigint;
  type: string;
  payload: any;
  actorId?: string | null;
  causedByEventId?: UUID | null;
}

export async function saveEvent(input: SaveEventInput) {
  const [result] = await drizzle
    .insert(events)
    .values({
      sessionId: input.sessionId,
      sequence: input.sequence,
      type: input.type,
      payload: input.payload,
      actorId: input.actorId,
      causedByEventId: input.causedByEventId,
    })
    .returning();
  return result;
}

export async function getEventsForSession(sessionId: UUID, fromSequence = 0n) {
  return await drizzle
    .select()
    .from(events)
    .where(and(eq(events.sessionId, sessionId), gte(events.sequence, fromSequence)))
    .orderBy(asc(events.sequence));
}
