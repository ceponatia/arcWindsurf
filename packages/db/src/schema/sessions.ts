import { pgTable, uuid, text, timestamp, bigint, boolean, index, unique } from 'drizzle-orm/pg-core';
import { userAccounts } from './users.js';
import { entityProfiles } from './entity-profiles.js';
import { locationMaps } from './location-maps.js';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerEmail: text('owner_email')
      .notNull()
      .references(() => userAccounts.email, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    settingId: uuid('setting_id').references(() => entityProfiles.id, { onDelete: 'set null' }),
    playerCharacterId: uuid('player_character_id').references(() => entityProfiles.id, {
      onDelete: 'set null',
    }),
    locationMapId: uuid('location_map_id').references(() => locationMaps.id, {
      onDelete: 'set null',
    }),
    status: text('status').default('active'), // 'active', 'paused', 'ended'
    mode: text('mode').default('solo'), // 'solo', 'multiplayer'
    eventSeq: bigint('event_seq', { mode: 'bigint' }).notNull().default(0n),
    totalTokensUsed: bigint('total_tokens_used', { mode: 'bigint' }).default(0n),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      ownerIdx: index('idx_sessions_owner').on(table.ownerEmail),
      statusIdx: index('idx_sessions_status').on(table.status),
    };
  }
);

export const sessionParticipants = pgTable(
  'session_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    userEmail: text('user_email')
      .notNull()
      .references(() => userAccounts.email, { onDelete: 'cascade' }),
    displayName: text('display_name'),
    role: text('role').notNull().default('player'), // 'player', 'gm', 'spectator'
    actorId: text('actor_id'),
    status: text('status').default('connected'),
    canControlNpcs: boolean('can_control_npcs').default(false),
    canEditWorld: boolean('can_edit_world').default(false),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      sessionUserUnique: unique().on(table.sessionId, table.userEmail),
      sessionIdx: index('idx_session_participants_session').on(table.sessionId),
    };
  }
);
