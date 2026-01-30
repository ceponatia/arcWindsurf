# TASK-001: Add Faction Database Tables

**Priority**: P1
**Status**: ✅ Complete
**Estimate**: 2-3 hours
**Depends On**: None
**Category**: Faction Service

---

## Objective

Create database tables for storing faction-to-faction relationships and actor-to-faction reputation.

## SQL Migration

### Faction Relationships Table

```sql
-- Stores relationships between factions (bidirectional)
CREATE TABLE faction_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faction_a_id UUID NOT NULL REFERENCES entity_profiles(id) ON DELETE CASCADE,
  faction_b_id UUID NOT NULL REFERENCES entity_profiles(id) ON DELETE CASCADE,
  relationship INTEGER NOT NULL DEFAULT 0, -- -100 (hostile) to 100 (allied)
  relationship_type TEXT, -- 'allied', 'neutral', 'rival', 'enemy', 'at_war'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique pairs (order doesn't matter at query time)
  CONSTRAINT faction_relationships_unique UNIQUE (faction_a_id, faction_b_id),
  -- Prevent self-relationships
  CONSTRAINT faction_relationships_no_self CHECK (faction_a_id != faction_b_id)
);

CREATE INDEX idx_faction_relationships_a ON faction_relationships(faction_a_id);
CREATE INDEX idx_faction_relationships_b ON faction_relationships(faction_b_id);
```

### Actor Faction Reputation Table

```sql
-- Stores individual actor reputation with factions (session-scoped)
CREATE TABLE actor_faction_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL, -- Player or NPC actor ID
  faction_id UUID NOT NULL REFERENCES entity_profiles(id) ON DELETE CASCADE,
  reputation INTEGER NOT NULL DEFAULT 0, -- -100 to 100
  reputation_level TEXT, -- 'hated', 'unfriendly', 'neutral', 'friendly', 'honored', 'exalted'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT actor_faction_reputation_unique UNIQUE (session_id, actor_id, faction_id)
);

CREATE INDEX idx_actor_faction_rep_session ON actor_faction_reputation(session_id);
CREATE INDEX idx_actor_faction_rep_actor ON actor_faction_reputation(actor_id);
CREATE INDEX idx_actor_faction_rep_faction ON actor_faction_reputation(faction_id);
```

## Drizzle Schema

```typescript
// packages/db/src/schema/faction.ts
import { pgTable, uuid, text, integer, timestamp, unique, check } from 'drizzle-orm/pg-core';
import { entityProfiles, sessions } from './index.js';

export const factionRelationships = pgTable(
  'faction_relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    factionAId: uuid('faction_a_id')
      .notNull()
      .references(() => entityProfiles.id, { onDelete: 'cascade' }),
    factionBId: uuid('faction_b_id')
      .notNull()
      .references(() => entityProfiles.id, { onDelete: 'cascade' }),
    relationship: integer('relationship').notNull().default(0),
    relationshipType: text('relationship_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniquePair: unique().on(table.factionAId, table.factionBId),
  })
);

export const actorFactionReputation = pgTable(
  'actor_faction_reputation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').notNull(),
    factionId: uuid('faction_id')
      .notNull()
      .references(() => entityProfiles.id, { onDelete: 'cascade' }),
    reputation: integer('reputation').notNull().default(0),
    reputationLevel: text('reputation_level'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueActorFaction: unique().on(table.sessionId, table.actorId, table.factionId),
  })
);
```

## Repository Functions

```typescript
// packages/db/src/repositories/faction.ts
import { eq, or, and, sql } from 'drizzle-orm';
import { drizzle } from '../index.js';
import { factionRelationships, actorFactionReputation } from '../schema/faction.js';

/**
 * Get relationship between two factions (bidirectional).
 */
export async function getFactionRelationship(
  factionAId: string,
  factionBId: string
): Promise<number> {
  const row = await drizzle
    .select({ relationship: factionRelationships.relationship })
    .from(factionRelationships)
    .where(
      or(
        and(
          eq(factionRelationships.factionAId, factionAId),
          eq(factionRelationships.factionBId, factionBId)
        ),
        and(
          eq(factionRelationships.factionAId, factionBId),
          eq(factionRelationships.factionBId, factionAId)
        )
      )
    )
    .limit(1);

  return row[0]?.relationship ?? 0;
}

/**
 * Set relationship between two factions.
 */
export async function setFactionRelationship(
  factionAId: string,
  factionBId: string,
  relationship: number,
  relationshipType?: string
): Promise<void> {
  // Normalize order for consistent storage
  const [a, b] = [factionAId, factionBId].sort();

  await drizzle
    .insert(factionRelationships)
    .values({
      factionAId: a,
      factionBId: b,
      relationship: Math.max(-100, Math.min(100, relationship)),
      relationshipType,
    })
    .onConflictDoUpdate({
      target: [factionRelationships.factionAId, factionRelationships.factionBId],
      set: {
        relationship: Math.max(-100, Math.min(100, relationship)),
        relationshipType,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get actor's reputation with a faction.
 */
export async function getActorReputation(
  sessionId: string,
  actorId: string,
  factionId: string
): Promise<number> {
  const row = await drizzle
    .select({ reputation: actorFactionReputation.reputation })
    .from(actorFactionReputation)
    .where(
      and(
        eq(actorFactionReputation.sessionId, sessionId),
        eq(actorFactionReputation.actorId, actorId),
        eq(actorFactionReputation.factionId, factionId)
      )
    )
    .limit(1);

  return row[0]?.reputation ?? 0;
}

/**
 * Update actor's reputation with a faction (additive).
 */
export async function updateActorReputation(
  sessionId: string,
  actorId: string,
  factionId: string,
  delta: number
): Promise<number> {
  const result = await drizzle
    .insert(actorFactionReputation)
    .values({
      sessionId,
      actorId,
      factionId,
      reputation: Math.max(-100, Math.min(100, delta)),
    })
    .onConflictDoUpdate({
      target: [
        actorFactionReputation.sessionId,
        actorFactionReputation.actorId,
        actorFactionReputation.factionId,
      ],
      set: {
        reputation: sql`GREATEST(-100, LEAST(100, ${actorFactionReputation.reputation} + ${delta}))`,
        reputationLevel: sql`CASE
          WHEN ${actorFactionReputation.reputation} + ${delta} <= -80 THEN 'hated'
          WHEN ${actorFactionReputation.reputation} + ${delta} <= -40 THEN 'unfriendly'
          WHEN ${actorFactionReputation.reputation} + ${delta} <= 40 THEN 'neutral'
          WHEN ${actorFactionReputation.reputation} + ${delta} <= 80 THEN 'friendly'
          ELSE 'honored'
        END`,
        updatedAt: new Date(),
      },
    })
    .returning({ reputation: actorFactionReputation.reputation });

  return result[0]?.reputation ?? 0;
}
```

## Acceptance Criteria

- [x] SQL migration created and tested (`packages/db/sql-fresh/007_factions/007_factions.sql`)
- [x] Drizzle schema defined with proper types (`packages/db/src/schema/faction.ts`)
- [x] Repository functions implemented (`packages/db/src/repositories/faction.ts`)
- [x] Bidirectional faction lookup works
- [x] Reputation clamped to -100 to 100 range
- [x] Reputation level auto-calculated

## Notes

- Consider adding `reputation_history` table for tracking changes over time
- Faction relationship type could drive NPC behavior (e.g., attack on sight if 'at_war')
