import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  bigint,
  integer,
  real,
  boolean,
  doublePrecision,
  index,
  unique,
  customType,
} from 'drizzle-orm/pg-core';

// Custom type for pgvector
const vector = customType<{ data: number[] }>({
  dataType(config) {
    const dimensions = (config as { dimensions?: number })?.dimensions ?? 1536;
    return `vector(${dimensions})`;
  },
});

// =============================================================================
// 001_FOUNDATION
// =============================================================================

export const userAccounts = pgTable('user_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  displayName: text('display_name'),
  roles: text('roles').array().default(['player']),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceDrafts = pgTable(
  'workspace_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    name: text('name'),
    workspaceState: jsonb('workspace_state').notNull().default({}),
    currentStep: text('current_step').notNull().default('setting'),
    validationState: jsonb('validation_state'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      userIdx: index('idx_workspace_drafts_user').on(table.userId),
      updatedIdx: index('idx_workspace_drafts_updated').on(table.updatedAt),
    };
  }
);

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

export const promptTags = pgTable('prompt_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  category: text('category').default('style'),
  promptText: text('prompt_text').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const plugins = pgTable('plugins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  description: text('description'),
  manifest: jsonb('manifest').notNull(),
  enabled: boolean('enabled').default(true),
  installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// =============================================================================
// 002_WORLD
// =============================================================================

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

export const locationPrefabs = pgTable('location_prefabs', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerEmail: text('owner_email').notNull().default('system'),
  name: text('name').notNull(),
  type: text('type').notNull().default('building'),
  description: text('description'),
  category: text('category'),
  nodesJson: jsonb('nodes_json').notNull().default([]),
  connectionsJson: jsonb('connections_json').notNull().default([]),
  entryPoints: text('entry_points').array().default([]),
  tags: text('tags').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const prefabLocationInstances = pgTable(
  'prefab_location_instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    prefabId: uuid('prefab_id')
      .notNull()
      .references(() => locationPrefabs.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    positionX: doublePrecision('position_x').notNull().default(0.5),
    positionY: doublePrecision('position_y').notNull().default(0.5),
    parentInstanceId: uuid('parent_instance_id').references(
      (): AnyPgColumn => prefabLocationInstances.id,
      {
        onDelete: 'set null',
      }
    ),
    depth: integer('depth').notNull().default(0),
    ports: jsonb('ports').default([]),
    overrides: jsonb('overrides').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      prefabLocationUnique: unique().on(table.prefabId, table.locationId),
    };
  }
);

export const prefabConnections = pgTable(
  'prefab_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    prefabId: uuid('prefab_id')
      .notNull()
      .references(() => locationPrefabs.id, { onDelete: 'cascade' }),
    fromInstanceId: uuid('from_instance_id')
      .notNull()
      .references(() => prefabLocationInstances.id, { onDelete: 'cascade' }),
    fromPortId: text('from_port_id').notNull().default('default'),
    toInstanceId: uuid('to_instance_id')
      .notNull()
      .references(() => prefabLocationInstances.id, { onDelete: 'cascade' }),
    toPortId: text('to_port_id').notNull().default('default'),
    direction: text('direction').notNull().default('horizontal'),
    bidirectional: boolean('bidirectional').notNull().default(true),
    travelMinutes: integer('travel_minutes'),
    locked: boolean('locked').notNull().default(false),
    lockReason: text('lock_reason'),
    label: text('label'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      connectionUnique: unique().on(
        table.prefabId,
        table.fromInstanceId,
        table.fromPortId,
        table.toInstanceId,
        table.toPortId
      ),
    };
  }
);

export const prefabEntryPoints = pgTable('prefab_entry_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  prefabId: uuid('prefab_id')
    .notNull()
    .references(() => locationPrefabs.id, { onDelete: 'cascade' }),
  targetInstanceId: uuid('target_instance_id')
    .notNull()
    .references(() => prefabLocationInstances.id, { onDelete: 'cascade' }),
  targetPortId: text('target_port_id').notNull().default('default'),
  name: text('name').notNull(),
  direction: text('direction'),
  positionX: doublePrecision('position_x').notNull().default(0.5),
  positionY: doublePrecision('position_y').notNull().default(0.5),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const scheduleTemplates = pgTable('schedule_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  scheduleJson: jsonb('schedule_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// =============================================================================
// 003_ACTORS
// =============================================================================

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

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    sequence: bigint('sequence', { mode: 'bigint' }).notNull(),
    type: text('type').notNull(), // 'SPOKE', 'MOVED', 'TICK', 'PLAYER_ACTION', etc.
    payload: jsonb('payload').notNull(),
    actorId: text('actor_id'),
    causedByEventId: uuid('caused_by_event_id').references((): AnyPgColumn => events.id, {
      onDelete: 'set null',
    }),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      sessionSeqUnique: unique().on(table.sessionId, table.sequence),
      sessionSeqIdx: index('idx_events_session_seq').on(table.sessionId, table.sequence),
      typeIdx: index('idx_events_type').on(table.type),
      actorIdx: index('idx_events_actor').on(table.actorId),
      timestampIdx: index('idx_events_timestamp').on(table.sessionId, table.timestamp),
    };
  }
);

export const actorStates = pgTable(
  'actor_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    actorType: text('actor_type').notNull(), // 'npc', 'player', 'system'
    actorId: text('actor_id').notNull(),
    entityProfileId: uuid('entity_profile_id').references(() => entityProfiles.id, {
      onDelete: 'set null',
    }),
    state: jsonb('state').notNull(), // XState persisted state + custom fields
    lastEventSeq: bigint('last_event_seq', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      sessionActorUnique: unique().on(table.sessionId, table.actorId),
      sessionIdx: index('idx_actor_states_session').on(table.sessionId),
      typeIdx: index('idx_actor_states_type').on(table.actorType),
    };
  }
);

export const sessionProjections = pgTable('session_projections', {
  sessionId: uuid('session_id')
    .primaryKey()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  location: jsonb('location').notNull().default({}),
  inventory: jsonb('inventory').notNull().default({}),
  time: jsonb('time').notNull().default({}),
  npcs: jsonb('npcs').notNull().default({}),
  worldState: jsonb('world_state').notNull().default({}),
  lastEventSeq: bigint('last_event_seq', { mode: 'bigint' }).notNull().default(0n),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

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

export const sessionPluginState = pgTable(
  'session_plugin_state',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    pluginId: text('plugin_id')
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    stateJson: jsonb('state_json').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      sessionPluginUnique: unique().on(table.sessionId, table.pluginId),
    };
  }
);

export const sessionTags = pgTable(
  'session_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => promptTags.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      sessionTagUnique: unique().on(table.sessionId, table.tagId),
    };
  }
);

// =============================================================================
// 004_KNOWLEDGE
// =============================================================================

export const knowledgeNodes = pgTable(
  'knowledge_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
    ownerEmail: text('owner_email').notNull(),
    actorId: text('actor_id'),
    nodeType: text('node_type').notNull(), // 'fact', 'event', 'relationship', 'rumor', 'belief'
    content: text('content').notNull(),
    summary: text('summary'),
    confidence: real('confidence').default(1.0),
    importance: real('importance').default(0.5),
    decayRate: real('decay_rate').default(0.0),
    sourceType: text('source_type'), // 'witnessed', 'heard', 'inferred', 'told'
    sourceEntityId: text('source_entity_id'),
    sourceEventId: uuid('source_event_id').references(() => events.id, { onDelete: 'set null' }),
    learnedAt: timestamp('learned_at', { withTimezone: true }).defaultNow(),
    lastRecalledAt: timestamp('last_recalled_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      sessionIdx: index('idx_knowledge_nodes_session').on(table.sessionId),
      actorIdx: index('idx_knowledge_nodes_actor').on(table.sessionId, table.actorId),
      typeIdx: index('idx_knowledge_nodes_type').on(table.nodeType),
    };
  }
);

export const knowledgeEdges = pgTable(
  'knowledge_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromNodeId: uuid('from_node_id')
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: 'cascade' }),
    toNodeId: uuid('to_node_id')
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: 'cascade' }),
    relation: text('relation').notNull(), // 'knows', 'contradicts', 'implies', 'caused_by'
    strength: real('strength').default(1.0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      edgeUnique: unique().on(table.fromNodeId, table.toNodeId, table.relation),
      fromIdx: index('idx_knowledge_edges_from').on(table.fromNodeId),
      toIdx: index('idx_knowledge_edges_to').on(table.toNodeId),
    };
  }
);

// =============================================================================
// 005_STUDIO
// =============================================================================

export const studioSessions = pgTable(
  'studio_sessions',
  {
    id: text('id').primaryKey(),
    profileSnapshot: jsonb('profile_snapshot').notNull(),
    conversation: jsonb('conversation').notNull().default([]),
    summary: text('summary'),
    inferredTraits: jsonb('inferred_traits').notNull().default([]),
    exploredTopics: jsonb('explored_topics').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => {
    return {
      expiresIdx: index('idx_studio_sessions_expires_at').on(table.expiresAt),
    };
  }
);
