import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { entityProfiles } from './entity-profiles.js';
import { locations } from './locations.js';

export const locationMaps = pgTable('location_maps', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerEmail: text('owner_email').notNull().default('system'),
  name: text('name').notNull(),
  description: text('description'),
  settingId: uuid('setting_id').references(() => entityProfiles.id, { onDelete: 'set null' }),
  nodesJson: jsonb('nodes_json').notNull().default([]),
  connectionsJson: jsonb('connections_json').notNull().default([]),
  defaultStartLocationId: uuid('default_start_location_id').references(() => locations.id, {
    onDelete: 'set null',
  }),
  tags: text('tags').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
