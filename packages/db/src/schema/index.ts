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
} from 'drizzle-orm/pg-core';
import { vector } from './vector.js';
import { entityProfiles } from './entity-profiles.js';
import { locations } from './locations.js';
import { sessions } from './sessions.js';
export { userAccounts } from './users.js';
export { entityProfiles } from './entity-profiles.js';
export { locations } from './locations.js';
export { locationMaps } from './location-maps.js';
export { sessions, sessionParticipants } from './sessions.js';

// =============================================================================
// 001_FOUNDATION
// =============================================================================

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

export * from './faction.js';

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

// =============================================================================
// 008_DIALOGUE
// =============================================================================

export const dialogueTrees = pgTable(
  'dialogue_trees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    npcId: text('npc_id').notNull(),
    triggerType: text('trigger_type').notNull(),
    triggerData: jsonb('trigger_data').notNull().default({}),
    startNodeId: text('start_node_id').notNull(),
    nodes: jsonb('nodes').notNull(),
    priority: integer('priority').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      npcIdx: index('idx_dialogue_trees_npc').on(table.npcId),
    };
  }
);

export const dialogueState = pgTable(
  'dialogue_state',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').references(() => sessions.id),
    npcId: text('npc_id').notNull(),
    treeId: uuid('tree_id').references(() => dialogueTrees.id),
    currentNodeId: text('current_node_id'),
    visitedNodes: text('visited_nodes').array().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      sessionNpcUnique: unique().on(table.sessionId, table.npcId),
    };
  }
);
