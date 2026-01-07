import { drizzle as db, sessionProjections } from '@minimal-rpg/db';
import { eq } from 'drizzle-orm';

export interface SnapshotUpdate {
  sessionId: string;
  name: string;
  state: any;
  lastEventSeq: bigint;
}

/**
 * Persists a projection state to the database.
 */
export async function saveProjectionState(update: SnapshotUpdate): Promise<void> {
  const { sessionId, name, state, lastEventSeq } = update;

  // Since sessionProjections has fixed columns, we map the name to the column.
  const columnMap: Record<string, string> = {
    session: 'location', // Map to location for now if session doesn't exist, but it should
    location: 'location',
    inventory: 'inventory',
    time: 'time',
    npcs: 'npcs',
  };

  const columnName = columnMap[name];
  if (!columnName) {
    throw new Error(`Unknown projection name: ${name}`);
  }

  await db
    .insert(sessionProjections)
    .values({
      sessionId,
      [columnName]: state,
      lastEventSeq,
      updatedAt: new Date(),
      // Fill defaults for others to satisfy NOT NULL constraints if it's the first insert
      location: columnName === 'location' ? state : {},
      inventory: columnName === 'inventory' ? state : {},
      time: columnName === 'time' ? state : {},
      npcs: columnName === 'npcs' ? state : {},
    })
    .onConflictDoUpdate({
      target: sessionProjections.sessionId,
      set: {
        [columnName]: state,
        lastEventSeq,
        updatedAt: new Date(),
      },
    });
}
