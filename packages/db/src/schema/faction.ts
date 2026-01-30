import { pgTable, uuid, text, integer, timestamp, index, unique } from 'drizzle-orm/pg-core';
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
    factionAIdx: index('idx_faction_relationships_a').on(table.factionAId),
    factionBIdx: index('idx_faction_relationships_b').on(table.factionBId),
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
    sessionIdx: index('idx_actor_faction_rep_session').on(table.sessionId),
    actorIdx: index('idx_actor_faction_rep_actor').on(table.actorId),
    factionIdx: index('idx_actor_faction_rep_faction').on(table.factionId),
  })
);
