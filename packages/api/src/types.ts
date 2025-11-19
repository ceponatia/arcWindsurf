import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import type { Message, Session } from '@minimal-rpg/db/node';
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

// Message DTO
export interface MessageResponse {
  role: ChatRole;
  content: string;
  createdAt: string;
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

// Prompt building
export interface BuildPromptOptions {
  character: CharacterProfile;
  setting: SettingProfile;
  history: Message[];
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

// Mapper input helpers (narrowing session to exported shape)
export type DbSession = Session;
export type DbMessage = Message;

// Mapper function signatures for discoverability
export type MapCharacterSummary = (c: CharacterProfile, source: 'fs' | 'db') => CharacterSummary;
export type MapSettingSummary = (s: SettingProfile, source: 'fs' | 'db') => SettingSummary;
export type MapSessionListItem = (
  s: Pick<DbSession, 'id' | 'characterId' | 'settingId' | 'createdAt'>,
  characterName?: string,
  settingName?: string
) => SessionListItem;
export type MapMessageResponse = (m: DbMessage) => MessageResponse;
