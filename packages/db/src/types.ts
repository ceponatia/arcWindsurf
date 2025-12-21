// Local shared types for DB utilities and filesystem helpers used by scripts
// Keep these minimal and focused on what we actually call.

export interface PgPoolLike {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
  end: () => Promise<void>;
}

export interface FsPromisesLike {
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
}

export interface PathLike {
  resolve: (...segments: string[]) => string;
  dirname: (p: string) => string;
  join: (...segments: string[]) => string;
}

export type SqlFile = string;
export type SqlText = string;

// DB row/params helpers used across client.ts
export type DbRow = Record<string, unknown>;
export type DbRows<T = DbRow> = T[];
export type SqlParams = unknown[];
export interface QueryResult<T> {
  rows: T[];
  rowCount?: number;
}

export interface PgClientLike {
  query: (text: string, params?: SqlParams) => Promise<QueryResult<DbRow>>;
  release: () => void;
}

export interface PgPoolStrict {
  connect: () => Promise<PgClientLike>;
  query: (text: string, params?: SqlParams) => Promise<QueryResult<DbRow>>;
  end: () => Promise<void>;
}

// UUID helpers for generators like node:crypto.randomUUID
export type UUID = string;
export type RandomUUID = () => UUID;

/**
 * Canonical ownership key for multi-tenant scoping.
 *
 * Today this is typically the authenticated user's verified email, normalized
 * to lowercase server-side. (For local/dev auth flows it may be a stable
 * identifier string.)
 */
export type OwnerEmail = string;

// pgvector integration helper signature
export type PgvectorRegisterType = (pg: unknown) => void;

// Minimal camelized entities returned from prisma-like helpers
export interface MessageEntity {
  idx: number;
  role: string;
  content: string;
  createdAt?: Date;
}

export interface UserSessionEntity {
  id: string;
  characterTemplateId: string;
  settingTemplateId: string;
  createdAt?: Date;
  messages?: MessageEntity[];
}

// Admin DB helpers shared with the API package
export interface DbColumn {
  name: string;
  type: string;
  isId: boolean;
  isRequired: boolean;
  isList: boolean;
}

export interface DbTableOverview {
  name: string;
  columns: DbColumn[];
  rowCount: number;
  sample: DbRow[];
}

export interface DbOverviewResult {
  tables: DbTableOverview[];
}

export interface DbPathInfo {
  url: string;
  path: string;
  exists: boolean;
}

// Prisma-style camelized rows returned from client.ts
export interface ProfileRow extends DbRow {
  id: string;
  profileJson: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CharacterProfileRow = ProfileRow;
export type SettingProfileRow = ProfileRow;
export type PersonaProfileRow = ProfileRow;

// Deprecated aliases for backward compatibility during refactor
export type CharacterTemplateRow = CharacterProfileRow;
export type SettingTemplateRow = SettingProfileRow;

export interface CharacterInstanceRow extends DbRow {
  id: string;
  sessionId: string;
  templateId: string;
  templateSnapshot: string;
  profileJson: string;
  overridesJson?: string;
  role: string;
  label?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SettingInstanceRow extends DbRow {
  id: string;
  sessionId: string;
  templateId: string;
  templateSnapshot: string;
  profileJson: string;
  overridesJson?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PersonaRow extends DbRow {
  id: string;
  userId: string | null;
  profileJson: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SessionPersonaRow extends DbRow {
  sessionId: string;
  personaId: string;
  profileJson: string;
  overridesJson: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MessageRow extends DbRow {
  id: string;
  sessionId: string;
  idx: number;
  role: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SessionHistoryRow extends DbRow {
  id: string;
  sessionId: string;
  turnIdx: number;
  ownerUserId?: string | null;
  playerInput: string;
  contextJson?: unknown;
  debugJson?: unknown;
  createdAt?: Date;
}

export interface UserSessionRow extends DbRow {
  id: string;
  characterTemplateId: string;
  settingTemplateId: string;
  createdAt?: Date;
  updatedAt?: Date;
  messages?: MessageRow[];
}

// Enhanced Prompt Tag with targeting, activation, and versioning
export interface PromptTagRow extends DbRow {
  id: string;
  owner: string;
  visibility: 'private' | 'public' | 'unlisted';
  name: string;
  short_description: string | null;
  category: 'style' | 'mechanic' | 'content' | 'world' | 'behavior' | 'trigger' | 'meta';
  prompt_text: string;
  activation_mode: 'always' | 'conditional';
  target_type: 'session' | 'character' | 'npc' | 'player' | 'location' | 'setting';
  triggers: unknown; // JSONB - TagTrigger[]
  priority: 'override' | 'high' | 'normal' | 'low' | 'fallback';
  composition_mode: 'append' | 'prepend' | 'replace' | 'merge';
  conflicts_with: string[] | null;
  requires: string[] | null;
  version: string;
  changelog: string | null;
  is_built_in: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Session Tag Binding (junction table for session-entity binding)
export interface SessionTagBindingRow extends DbRow {
  id: string;
  session_id: string;
  tag_id: string;
  target_type: 'session' | 'character' | 'npc' | 'player' | 'location' | 'setting';
  target_entity_id: string | null;
  enabled: boolean;
  created_at?: Date;
}

// Deprecated: SessionTagInstanceRow - kept for backward compatibility during migration
/** @deprecated Use SessionTagBindingRow instead */
export interface SessionTagInstanceRow extends DbRow {
  id: string;
  session_id: string;
  tag_id: string | null;
  name: string;
  short_description: string;
  prompt_text: string;
  created_at?: Date;
}

// Item definition (library/template)
export interface ItemDefinitionRow extends DbRow {
  id: string;
  category: string;
  // JSONB columns are auto-parsed by node-postgres
  definitionJson: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

// Item instance (per-session copy)
export interface ItemInstanceRow extends DbRow {
  id: string;
  sessionId: string;
  definitionId: string;
  // JSONB columns are auto-parsed by node-postgres
  definitionSnapshot: unknown;
  ownerType: string;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Session helpers exposed by sessions.ts
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Speaker metadata persisted with assistant messages.
 * Enables UI to display NPC name/avatar on reload.
 */
export interface MessageSpeaker {
  /** Character template ID of the NPC who spoke */
  id: string;
  /** Display name of the speaker at time of message */
  name: string;
  /** Profile picture URL of the speaker at time of message */
  profilePic?: string;
}

export interface SessionMessage {
  role: MessageRole;
  content: string;
  createdAt: string;
  idx: number;
  /** Speaker metadata for assistant messages */
  speaker?: MessageSpeaker;
}

export interface SessionRecord {
  id: UUID;
  characterTemplateId: string;
  characterInstanceId: string | null;
  settingTemplateId: string;
  settingInstanceId: string | null;
  createdAt: string;
  messages: SessionMessage[];
}

export type SessionSummaryRecord = Pick<
  SessionRecord,
  | 'id'
  | 'characterTemplateId'
  | 'characterInstanceId'
  | 'settingTemplateId'
  | 'settingInstanceId'
  | 'createdAt'
>;

// =============================================================================
// NPC Location State Types
// =============================================================================

/**
 * Row type for session_npc_location_state table.
 * Tracks where an NPC is and what they're doing.
 */
export interface NpcLocationStateRow extends DbRow {
  id: string;
  sessionId: string;
  npcId: string;
  locationId: string;
  subLocationId: string | null;
  /** JSONB NpcActivity */
  activityJson: unknown;
  /** JSONB GameTime */
  arrivedAtJson: unknown;
  interruptible: boolean;
  scheduleSlotId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Row type for session_npc_simulation_cache table.
 * Caches simulation state for lazy simulation.
 */
export interface NpcSimulationCacheRow extends DbRow {
  id: string;
  sessionId: string;
  npcId: string;
  /** JSONB GameTime */
  lastComputedAtJson: unknown;
  /** JSONB NpcLocationState */
  currentStateJson: unknown;
  /** JSONB Record<string, ResolvedScheduleOption> */
  dayDecisionsJson: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Row type for session_location_occupancy_cache table.
 * Caches occupancy state for visited locations.
 */
export interface LocationOccupancyCacheRow extends DbRow {
  id: string;
  sessionId: string;
  locationId: string;
  /** JSONB LocationOccupancy */
  occupancyJson: unknown;
  /** JSONB GameTime */
  computedAtJson: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

// =============================================================================
// NPC Hygiene State Types
// =============================================================================

/**
 * Row type for npc_hygiene_state table.
 * Tracks hygiene decay per body part for NPCs.
 */
export interface NpcHygieneStateRow extends DbRow {
  id: string;
  sessionId: string;
  npcId: string;
  bodyPart: string;
  /** Accumulated decay points */
  points: number;
  /** Computed hygiene level 0-4 */
  level: number;
  lastUpdatedAt?: Date;
  createdAt?: Date;
}

// =============================================================================
// Schedule Template Types
// =============================================================================

/**
 * Row type for schedule_templates table.
 * Reusable schedule templates for NPC daily routines.
 */
export interface ScheduleTemplateRow extends DbRow {
  id: string;
  name: string;
  description: string | null;
  /** JSONB schedule template structure */
  templateData: unknown;
  /** Required placeholders that must be provided */
  requiredPlaceholders: string[];
  /** Whether this is a built-in system template */
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Row type for npc_schedules table.
 * Resolved schedules for specific NPCs in sessions.
 */
export interface NpcScheduleRow extends DbRow {
  id: string;
  sessionId: string;
  npcId: string;
  /** Reference to the template used */
  templateId: string | null;
  /** JSONB resolved schedule with actual location IDs */
  scheduleData: unknown;
  /** JSONB map of placeholder key to resolved location ID */
  placeholderMappings: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}
