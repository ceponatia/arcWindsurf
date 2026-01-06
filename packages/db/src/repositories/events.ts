import { db } from '../connection/drizzle.js';
import { events } from '../schema/index.js';
import { type WorldEvent } from '@minimal-rpg/schemas';

export class EventRepository {
  /**
   * Persist a world event to the database.
   */
  async save(sessionId: string, event: WorldEvent, sequence: bigint): Promise<void> {
    await db.insert(events).values({
      sessionId,
      type: event.type,
      payload: event as any,
      sequence,
      timestamp: new Date(),
    });
  }

  /**
   * Load events for a session, ordered by sequence.
   */
  async getEventsForSession(sessionId: string, fromSequence = 0n) {
    return await db.query.events.findMany({
      where: (table: any, { eq, and, gte }: any) => and(
        eq(table.sessionId, sessionId),
        gte(table.sequence, fromSequence)
      ),
      orderBy: (table: any, { asc }: any) => [asc(table.sequence)],
    });
  }
}

export const eventRepository = new EventRepository();
