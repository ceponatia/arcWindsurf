import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { vector } from './vector.js';

export const entityProfiles = pgTable(
  'entity_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type').notNull(), // 'character', 'setting', 'item', 'faction', 'persona'
    name: text('name').notNull(),
    ownerEmail: text('owner_email').notNull().default('public'),
    visibility: text('visibility').default('public'),
    tier: text('tier'), // 'major', 'minor', 'background'
    profileJson: jsonb('profile_json').notNull().default({}),
    tags: text('tags').array().default([]),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      typeIdx: index('idx_entity_profiles_type').on(table.entityType),
      ownerIdx: index('idx_entity_profiles_owner').on(table.ownerEmail),
      nameIdx: index('idx_entity_profiles_name').on(table.name),
    };
  }
);
