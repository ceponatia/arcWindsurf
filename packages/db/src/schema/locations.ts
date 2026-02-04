import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { entityProfiles } from './entity-profiles.js';
import { vector } from './vector.js';

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerEmail: text('owner_email').notNull().default('system'),
    settingId: uuid('setting_id').references(() => entityProfiles.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    type: text('type').notNull().default('room'),
    description: text('description'),
    summary: text('summary'),
    isTemplate: boolean('is_template').notNull().default(false),
    tags: text('tags').array().default([]),
    properties: jsonb('properties').default({}),
    atmosphere: jsonb('atmosphere').default({}),
    capacity: integer('capacity'),
    accessibility: text('accessibility').default('open'),
    parentLocationId: uuid('parent_location_id').references((): AnyPgColumn => locations.id, {
      onDelete: 'set null',
    }),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      ownerIdx: index('idx_locations_owner').on(table.ownerEmail),
      typeIdx: index('idx_locations_type').on(table.type),
      templateIdx: index('idx_locations_template').on(table.isTemplate),
    };
  }
);
