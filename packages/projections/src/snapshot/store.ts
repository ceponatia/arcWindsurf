import { drizzle as db, sessionProjections } from '@minimal-rpg/db';
import { getRecordOptional } from '@minimal-rpg/schemas';

type ProjectionColumnName = 'location' | 'inventory' | 'time' | 'npcs';

export interface SnapshotUpdate {
  sessionId: string;
  name: string;
  state: unknown;
  lastEventSeq: bigint;
}

/**
 * Persists a projection state to the database.
 */
export async function saveProjectionState(update: SnapshotUpdate): Promise<void> {
  const { sessionId, name, state, lastEventSeq } = update;

  // Since sessionProjections has fixed columns, we map the name to the column.
  const columnMap: Record<string, ProjectionColumnName> = {
    session: 'location',
    location: 'location',
    inventory: 'inventory',
    time: 'time',
    npcs: 'npcs',
  };

  const columnName = getRecordOptional(columnMap, name);
  if (!columnName) {
    throw new Error(`Unknown projection name: ${name}`);
  }

  const baseValues = {
    sessionId,
    lastEventSeq,
    updatedAt: new Date(),
    location: {},
    inventory: {},
    time: {},
    npcs: {},
  };

  // We use a type-safe assignment based on the validated columnName
  const finalValues = {
    ...baseValues,
    [columnName]: state,
  };

  await db
    .insert(sessionProjections)
    .values(finalValues)
    .onConflictDoUpdate({
      target: sessionProjections.sessionId,
      set: {
        [columnName]: state,
        lastEventSeq,
        updatedAt: new Date(),
      },
    });
}
