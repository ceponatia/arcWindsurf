import { db, events, sessionProjections, eq, gt, and, asc } from '@minimal-rpg/db';
import { WorldEventSchema, type WorldEvent } from '@minimal-rpg/schemas';
import type { Projection, ReplayOptions } from './types.js';

export class Projector<S> {
  private currentState: S;
  private lastSequence = -1n;

  constructor(
    public readonly projection: Projection<S>,
    private sessionId: string
  ) {
    this.currentState = projection.initialState;
  }

  /**
   * Get the current projection state.
   */
  getState(): S {
    return this.currentState;
  }

  /**
   * Get the last processed sequence number.
   */
  getLastSequence(): bigint {
    return this.lastSequence;
  }

  /**
   * Initialize state from the projection table in DB.
   */
  async loadSnapshot(): Promise<void> {
    const row = await db.query.sessionProjections.findFirst({
      where: eq(sessionProjections.sessionId, this.sessionId),
    });

    if (row) {
      this.currentState = row[this.projection.name as keyof typeof row] as S;
      this.lastSequence = row.lastEventSeq;
    }
  }

  /**
   * Replay events from the database to catch up to the current state.
   */
  async replay(options: ReplayOptions = {}): Promise<void> {
    const { untilSeq, batchSize = 100 } = options;

    let currentSeq = this.lastSequence;
    let hasMore = true;

    while (hasMore) {
      const rows = await db
        .select()
        .from(events)
        .where(and(eq(events.sessionId, this.sessionId), gt(events.sequence, currentSeq)))
        .orderBy(asc(events.sequence))
        .limit(batchSize);

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of rows) {
        if (untilSeq !== undefined && row.sequence > untilSeq) {
          hasMore = false;
          break;
        }

        const event = WorldEventSchema.parse(row.payload);
        this.currentState = this.projection.reducer(this.currentState, event);
        this.lastSequence = row.sequence;
        currentSeq = row.sequence;
      }

      if (rows.length < batchSize) {
        hasMore = false;
      }
    }
  }

  /**
   * Apply a single event to the state (Live update).
   * This does NOT persist the state to the DB.
   */
  applyEvent(event: WorldEvent, sequence: bigint): void {
    if (sequence <= this.lastSequence) {
      // Ignore old events
      return;
    }

    this.currentState = this.projection.reducer(this.currentState, event);
    this.lastSequence = sequence;
  }
}
