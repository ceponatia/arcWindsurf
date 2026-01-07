import { eq, and, gte, asc } from 'drizzle-orm';
import { drizzle } from '../connection/drizzle.js';
import { events } from '../schema/index.js';
import { type WorldEvent } from '@minimal-rpg/schemas';

export class EventRepository {
  /**
   * Persist a world event to the database.
   */
  async save(sessionId: string, event: WorldEvent, sequence: bigint): Promise<void> {
    await drizzle.insert(events).values({
      sessionId,
      type: event.type,
      payload: event,
      sequence,
      timestamp: new Date(),
    });
  }

  /**
   * Load events for a session, ordered by sequence.
   */
  async getEventsForSession(sessionId: string, fromSequence = 0n) {
    return await drizzle.query.events.findMany({
      where: and(eq(events.sessionId, sessionId), gte(events.sequence, fromSequence)),
      orderBy: [asc(events.sequence)],
    });
  }
}

export const eventRepository = new EventRepository();
