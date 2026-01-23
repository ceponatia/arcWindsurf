# TASK-006: Add state_changes Table for Background NPC State

**Priority**: P1
**Estimate**: 2 hours
**Depends On**: None (schema task)
**Category**: Living World Game Loop - Schema

---

## Objective

Create a new `state_changes` table to track ephemeral state changes for background NPCs, keeping the main `events` table lean while still supporting ambient narration and debugging.

## Problem Statement

Background NPCs generate frequent state changes (location, activity, engagement) that:

- Need to be queryable for ambient narration ("The bartender begins wiping the counter")
- Should NOT bloat the `events` table (which is for significant, replayable events)
- Are ephemeral (can be pruned after session save or time period)

## Files to Modify

- `packages/db/src/schema/index.ts` - Add table definition
- `packages/db/src/repositories/state-changes.ts` - Create repository (NEW)
- `packages/db/src/index.ts` - Export new repository

## Schema Design

```typescript
export const stateChanges = pgTable(
  'state_changes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').notNull(),
    actorTier: text('actor_tier').notNull(), // 'major' | 'minor' | 'background' | 'transient'
    changeType: text('change_type').notNull(), // 'location' | 'activity' | 'engagement' | 'schedule'
    previousValue: jsonb('previous_value'),
    newValue: jsonb('new_value').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      sessionActorIdx: index('idx_state_changes_session_actor').on(table.sessionId, table.actorId),
      timestampIdx: index('idx_state_changes_timestamp').on(table.timestamp),
      sessionTimestampIdx: index('idx_state_changes_session_timestamp').on(
        table.sessionId,
        table.timestamp
      ),
    };
  }
);
```

## Repository Functions

```typescript
// packages/db/src/repositories/state-changes.ts

import { drizzle as db, stateChanges, eq, and, gt, lt, desc } from '../index.js';

export interface StateChangeRecord {
  sessionId: string;
  actorId: string;
  actorTier: 'major' | 'minor' | 'background' | 'transient';
  changeType: 'location' | 'activity' | 'engagement' | 'schedule';
  previousValue?: unknown;
  newValue: unknown;
}

/**
 * Record a state change for an NPC.
 */
export async function recordStateChange(record: StateChangeRecord): Promise<void> {
  await db.insert(stateChanges).values({
    sessionId: record.sessionId,
    actorId: record.actorId,
    actorTier: record.actorTier,
    changeType: record.changeType,
    previousValue: record.previousValue,
    newValue: record.newValue,
  });
}

/**
 * Get recent state changes for a session (for ambient narration).
 */
export async function getRecentStateChanges(
  sessionId: string,
  options: {
    since?: Date;
    actorIds?: string[];
    changeTypes?: string[];
    limit?: number;
  } = {}
): Promise<(typeof stateChanges.$inferSelect)[]> {
  const { since, actorIds, changeTypes, limit = 50 } = options;

  let query = db
    .select()
    .from(stateChanges)
    .where(eq(stateChanges.sessionId, sessionId))
    .orderBy(desc(stateChanges.timestamp))
    .limit(limit);

  // Additional filters would be applied via and() conditions

  return query;
}

/**
 * Prune old state changes for a session.
 * Call after session save or periodically.
 */
export async function pruneStateChanges(sessionId: string, olderThan: Date): Promise<number> {
  const result = await db
    .delete(stateChanges)
    .where(and(eq(stateChanges.sessionId, sessionId), lt(stateChanges.timestamp, olderThan)));

  return result.rowCount ?? 0;
}

/**
 * Get the latest state for an actor (most recent change of each type).
 */
export async function getLatestActorState(
  sessionId: string,
  actorId: string
): Promise<Record<string, unknown>> {
  const changes = await db
    .select()
    .from(stateChanges)
    .where(and(eq(stateChanges.sessionId, sessionId), eq(stateChanges.actorId, actorId)))
    .orderBy(desc(stateChanges.timestamp));

  // Reduce to latest value per changeType
  const latest: Record<string, unknown> = {};
  for (const change of changes) {
    if (!(change.changeType in latest)) {
      latest[change.changeType] = change.newValue;
    }
  }

  return latest;
}
```

## Integration with StateChangeService

Create a service layer for use by actor cognition:

```typescript
// packages/api/src/services/state-change-service.ts

import { recordStateChange, getRecentStateChanges } from '@minimal-rpg/db';

export class StateChangeService {
  /**
   * Record a background NPC state change.
   * Only records for background/transient tiers - major/minor use events table.
   */
  async record(change: {
    sessionId: string;
    actorId: string;
    actorTier: string;
    changeType: string;
    previousValue?: unknown;
    newValue: unknown;
  }): Promise<void> {
    // Only record for background/transient tiers
    if (change.actorTier !== 'background' && change.actorTier !== 'transient') {
      return; // Major/minor NPCs use events table
    }

    await recordStateChange({
      sessionId: change.sessionId,
      actorId: change.actorId,
      actorTier: change.actorTier as 'background' | 'transient',
      changeType: change.changeType as 'location' | 'activity' | 'engagement' | 'schedule',
      previousValue: change.previousValue,
      newValue: change.newValue,
    });
  }

  /**
   * Get recent changes for ambient narration.
   */
  async getRecent(sessionId: string, since: Date): Promise<StateChange[]> {
    return getRecentStateChanges(sessionId, { since });
  }
}
```

## Acceptance Criteria

- [ ] `state_changes` table added to schema
- [ ] Indexes created for efficient queries
- [ ] Repository functions implemented (record, getRecent, prune, getLatest)
- [ ] StateChangeService created for actor integration
- [ ] Drizzle migration generated
- [ ] Unit tests for repository functions

## Migration

Run after schema update:

```bash
cd packages/db
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

## Notes

- Consider adding a `pruneOnSave` flag to session config
- May want to add `batchRecord()` for efficiency during tick processing
- Future: Consider partitioning by session_id for very active sessions
