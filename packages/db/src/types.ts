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
export interface DbRow {
  [key: string]: unknown;
}
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

export interface SessionMessage {
  role: MessageRole;
  content: string;
  createdAt: string;
  idx: number;
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
