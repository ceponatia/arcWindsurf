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
  tone: string;
  source: 'fs' | 'db';
}

// Sessions list item decoration
export interface SessionListItem {
  id: string;
  characterId: string;
  settingId: string;
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
  characterId: string;
  settingId: string;
  createdAt: string;
  messages: DbMessage[];
}

export type DbSessionSummary = Pick<DbSession, 'id' | 'characterId' | 'settingId' | 'createdAt'>;

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
  characterId: string;
  settingId: string;
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
export interface TemplateProfileRow {
  id: string;
  profileJson: string;
}
export type CharacterTemplateRow = TemplateProfileRow;
export type SettingTemplateRow = TemplateProfileRow;

interface InstanceRowBase {
  id: string;
  sessionId: string;
  baseline: string | null;
  overrides: string | null;
}

export interface CharacterInstanceRow extends InstanceRowBase {
  templateCharacterId: string;
}

export interface SettingInstanceRow extends InstanceRowBase {
  templateSettingId: string;
}

export interface MessageRow {
  id: string;
  sessionId: string;
  idx: number;
  role: ChatRole;
  content: string;
  createdAt?: string | Date | null;
}

interface TemplateTable<T extends TemplateProfileRow> {
  findMany(): Promise<T[]>;
  findUnique(args: { where: { id: string } }): Promise<T | null>;
  create(args: { data: { id: string; profileJson: string } }): Promise<T>;
  update(args: { where: { id: string }; data: { profileJson: string } }): Promise<T>;
  delete(args: { where: { id: string } }): Promise<void>;
}

interface CharacterInstanceTable {
  findUnique(args: {
    where: {
      sessionId_templateCharacterId?: { sessionId: string; templateCharacterId: string };
      id?: string;
    };
  }): Promise<CharacterInstanceRow | null>;
  create(args: {
    data: {
      id: string;
      sessionId: string;
      templateCharacterId: string;
      baseline: string;
      overrides: string;
    };
  }): Promise<CharacterInstanceRow>;
  update(args: {
    where: { id: string };
    data: { overrides?: string };
  }): Promise<CharacterInstanceRow>;
}

interface SettingInstanceTable {
  findUnique(args: {
    where: {
      sessionId_templateSettingId?: { sessionId: string; templateSettingId: string };
      id?: string;
    };
  }): Promise<SettingInstanceRow | null>;
  create(args: {
    data: {
      id: string;
      sessionId: string;
      templateSettingId: string;
      baseline: string;
      overrides: string;
    };
  }): Promise<SettingInstanceRow>;
  update(args: {
    where: { id: string };
    data: { overrides?: string };
  }): Promise<SettingInstanceRow>;
}

export interface PrismaClientLike {
  characterTemplate: TemplateTable<CharacterTemplateRow>;
  settingTemplate: TemplateTable<SettingTemplateRow>;
  message: {
    update(args: {
      where: { sessionId: string; idx: number };
      data: { content: string };
    }): Promise<MessageRow | null>;
  };
  characterInstance: CharacterInstanceTable;
  settingInstance: SettingInstanceTable;
}

export interface SessionsClientLike {
  createSession(id: string, characterId: string, settingId: string): Promise<DbSession>;
  getSession(id: string): Promise<DbSession | undefined>;
  listSessions(): Promise<DbSessionSummary[]>;
  deleteSession(id: string): Promise<void>;
  appendMessage(sessionId: string, role: ChatRole, content: string): Promise<void>;
}
