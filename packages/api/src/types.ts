import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import type { getDbOverview, getDbPathInfo } from '@minimal-rpg/db/node';

// Errors & API status
export interface ApiError {
  ok: false;
  error: string | Record<string, unknown>;
}

// Runtime config (public subset)
export interface RuntimeConfigPublic {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterModel: string;
}

// Full internal runtime configuration (includes secrets / private values)
export interface RuntimeConfig {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterApiKey: string;
  openrouterModel: string;
}

// Loaded data (characters + settings)
export interface LoadedData {
  characters: CharacterProfile[];
  settings: SettingProfile[];
}
export type LoadedDataGetter = () => LoadedData | undefined;

// Profile summaries (DTOs)
export interface CharacterSummary {
  id: string;
  name: string;
  summary: string;
  tags?: string[];
  source: 'fs' | 'db';
}
export interface SettingSummary {
  id: string;
  name: string;
  source: 'fs' | 'db';
}

// Sessions list item decoration
export interface SessionListItem {
  id: string;
  characterTemplateId: string;
  characterInstanceId: string | null;
  settingTemplateId: string;
  settingInstanceId: string | null;
  createdAt: string;
  characterName?: string;
  settingName?: string;
}

export interface DbMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
  idx: number;
}

export interface DbSession {
  id: string;
  characterTemplateId: string;
  characterInstanceId: string | null;
  settingTemplateId: string;
  settingInstanceId: string | null;
  createdAt: string;
  messages: DbMessage[];
}

export type DbSessionSummary = Pick<
  DbSession,
  | 'id'
  | 'characterTemplateId'
  | 'characterInstanceId'
  | 'settingTemplateId'
  | 'settingInstanceId'
  | 'createdAt'
>;

// Message DTO
export interface MessageResponse {
  role: ChatRole;
  content: string;
  createdAt: string;
  idx?: number;
}

// Session creation
export interface CreateSessionRequest {
  characterId: string;
  settingId: string;
}
export interface CreateSessionResponse {
  id: string;
  characterTemplateId: string;
  characterInstanceId: string | null;
  settingTemplateId: string;
  settingInstanceId: string | null;
  createdAt: string;
}

// Message append
export interface MessageRequest {
  content: string;
}
export interface MessageResponseBody {
  message: MessageResponse;
}

// Effective merged profiles response
export interface EffectiveProfilesResponse {
  character: CharacterProfile;
  setting: SettingProfile;
}

// Overrides
export type OverridesObject = Record<string, unknown>;
export interface OverridesAudit {
  baseline: Record<string, unknown>;
  overrides: Record<string, unknown>;
  previous?: Record<string, unknown>;
}

// LLM chat roles
export type ChatRole = 'system' | 'user' | 'assistant';

// LLM generation options (provider-agnostic)
export interface LlmGenerationOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  timeoutMs?: number;
}

export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

// Normalized LLM response
export interface LlmResponse {
  id?: string;
  role: ChatRole;
  content: string;
  model: string;
  createdAt: string;
  usage?: LlmUsage;
  openrouterMeta?: Record<string, unknown>;
  ollamaMeta?: Record<string, unknown>;
  toolsMeta?: Record<string, unknown>;
  embeddingVector?: number[];
}

// Provider interface
export interface LlmProvider {
  generate(
    messages: { role: ChatRole; content: string }[],
    model: string,
    options?: LlmGenerationOptions
  ): Promise<LlmResponse | ApiError>;
}

export type GenerateWithOpenRouterFn = (
  params: { apiKey: string; model: string; messages: { role: ChatRole; content: string }[] },
  options?: LlmGenerationOptions
) => Promise<LlmResponse | ApiError>;

// Prompt building
export interface BuildPromptOptions {
  character: CharacterProfile;
  setting: SettingProfile;
  history: DbMessage[];
  historyWindow?: number;
  summaryMaxChars?: number;
}
export type BuildPromptResult = { role: 'system' | 'user' | 'assistant'; content: string }[];

export interface ContentFilterResult {
  flagged: boolean;
  note: string;
}

// Admin DB types (aliases to external return shapes)
export type AdminDbOverview = Awaited<ReturnType<typeof getDbOverview>>;
export type AdminDbPathInfo = Awaited<ReturnType<typeof getDbPathInfo>>;

// Config / health / hello DTOs
export interface HelloResponse {
  ok: true;
  message: string;
}
export interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number;
  version: string;
  db: { ok: boolean };
  llm: { provider: string; model: string; configured: boolean };
}
export type RuntimeConfigResponse = RuntimeConfigPublic;

// Mapper function signatures for discoverability
export type MapCharacterSummary = (c: CharacterProfile, source: 'fs' | 'db') => CharacterSummary;
export type MapSettingSummary = (s: SettingProfile, source: 'fs' | 'db') => SettingSummary;
export type MapSessionListItem = (
  s: DbSessionSummary,
  characterName?: string,
  settingName?: string
) => SessionListItem;
export type MapMessageResponse = (m: DbMessage) => MessageResponse;

// DB rows returned from @minimal-rpg/db prisma-like helpers
export interface ProfileRow {
  id: string;
  profileJson: string;
}
export type CharacterProfileRow = ProfileRow;
export type SettingProfileRow = ProfileRow;

// Deprecated aliases
export type CharacterTemplateRow = CharacterProfileRow;
export type SettingTemplateRow = SettingProfileRow;

export interface CharacterInstanceRow {
  id: string;
  sessionId: string;
  templateId: string;
  templateSnapshot: string;
  profileJson: string;
}

export interface SettingInstanceRow {
  id: string;
  sessionId: string;
  templateId: string;
  templateSnapshot: string;
  profileJson: string;
}

export interface MessageRow {
  id: string;
  sessionId: string;
  idx: number;
  role: ChatRole;
  content: string;
  createdAt?: string | Date | null;
}

interface ProfileTable<T extends ProfileRow> {
  findMany(): Promise<T[]>;
  findUnique(args: { where: { id: string } }): Promise<T | null>;
  create(args: { data: { id: string; profileJson: string } }): Promise<T>;
  update(args: { where: { id: string }; data: { profileJson: string } }): Promise<T>;
  delete(args: { where: { id: string } }): Promise<void>;
}

// Deprecated alias
type TemplateTable<T extends ProfileRow> = ProfileTable<T>;
interface CharacterInstanceTable {
  findUnique(args: {
    where: { id?: string; sessionId?: string };
  }): Promise<CharacterInstanceRow | null>;
  create(args: {
    data: {
      id: string;
      sessionId: string;
      templateId: string;
      templateSnapshot: string;
      profileJson: string;
    };
  }): Promise<CharacterInstanceRow>;
  update(args: {
    where: { id: string };
    data: { profileJson?: string };
  }): Promise<CharacterInstanceRow>;
  delete(args: { where: { id: string } }): Promise<void>;
}

interface SettingInstanceTable {
  findUnique(args: {
    where: { id?: string; sessionId?: string };
  }): Promise<SettingInstanceRow | null>;
  create(args: {
    data: {
      id: string;
      sessionId: string;
      templateId: string;
      templateSnapshot: string;
      profileJson: string;
    };
  }): Promise<SettingInstanceRow>;
  update(args: {
    where: { id: string };
    data: { profileJson?: string };
  }): Promise<SettingInstanceRow>;
  delete(args: { where: { id: string } }): Promise<void>;
}

export interface PrismaClientLike {
  characterProfile: ProfileTable<CharacterProfileRow>;
  settingProfile: ProfileTable<SettingProfileRow>;
  message: {
    update(args: {
      where: { sessionId: string; idx: number };
      data: { content: string };
    }): Promise<MessageRow | null>;
    findFirst(args: {
      where: { sessionId: string; idx?: number };
      orderBy?: { idx?: 'asc' | 'desc' };
    }): Promise<MessageRow | null>;
    deleteMany(args?: { where?: { sessionId?: string; idx?: number } }): Promise<void>;
  };
  characterTemplate: TemplateTable<CharacterTemplateRow>;
  settingTemplate: TemplateTable<SettingTemplateRow>;
  characterInstance: CharacterInstanceTable;
  settingInstance: SettingInstanceTable;
}

export interface SessionsClientLike {
  createSession(
    id: string,
    characterTemplateId: string,
    settingTemplateId: string
  ): Promise<DbSession>;
  getSession(id: string): Promise<DbSession | undefined>;
  listSessions(): Promise<DbSessionSummary[]>;
  deleteSession(id: string): Promise<void>;
  appendMessage(sessionId: string, role: ChatRole, content: string): Promise<void>;
}
