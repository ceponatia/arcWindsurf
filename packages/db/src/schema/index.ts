import { pgTable, uuid, text, timestamp, jsonb, bigint, index, unique } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  eventSeq: bigint('event_seq', { mode: 'bigint' }).notNull().default(0n),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  actorId: uuid('actor_id'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  sequence: bigint('sequence', { mode: 'bigint' }).notNull(),
}, (table) => {
  return {
    sessionSeqIdx: index('idx_events_session_seq').on(table.sessionId, table.sequence),
    typeIdx: index('idx_events_type').on(table.type),
    actorIdx: index('idx_events_actor').on(table.actorId),
  };
});

export const actorStates = pgTable('actor_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  actorType: text('actor_type').notNull(), // 'npc', 'player', 'system'
  actorId: text('actor_id').notNull(),   // e.g., 'barkeep', 'player_1'
  state: jsonb('state').notNull(),     // XState persisted state
  lastEventSeq: bigint('last_event_seq', { mode: 'bigint' }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    sessionActorUnique: unique('unique_session_actor').on(table.sessionId, table.actorId),
  };
});

export const sessionProjections = pgTable('session_projections', {
  sessionId: uuid('session_id').primaryKey().references(() => sessions.id),
  location: jsonb('location').notNull(),
  inventory: jsonb('inventory').notNull(),
  time: jsonb('time').notNull(),
  npcs: jsonb('npcs').notNull(),
  lastEventSeq: bigint('last_event_seq', { mode: 'bigint' }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
