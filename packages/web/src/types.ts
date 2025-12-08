import type { Dispatch, SetStateAction } from 'react';
import type { Build, ItemCategory } from '@minimal-rpg/schemas';

export interface CharacterSummary {
  id: string;
  name: string;
  summary: string;
  tags?: string[];
  source?: 'fs' | 'db';
}

export interface SettingSummary {
  id: string;
  name: string;
  tone: string;
}

export interface ItemSummary {
  id: string;
  name: string;
  category: ItemCategory;
  type: string;
  description: string;
  tags?: string[];
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  createdAt: string; // ISO timestamp
  idx?: number;
  turnMetadata?: TurnMetadata;
}

export interface Session {
  id: string;
  characterTemplateId: string;
  characterInstanceId: string | null;
  settingTemplateId: string;
  settingInstanceId: string | null;
  createdAt: string; // ISO timestamp
  messages: Message[];
}

export interface RuntimeConfigResponse {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterModel: string;
  governorDevMode: boolean;
}

export type JsonPatchOperationOp = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

export interface JsonPatchOperation {
  op: JsonPatchOperationOp;
  path: string;
  from?: string;
  value?: unknown;
}

export type IntentType =
  | 'move'
  | 'look'
  | 'talk'
  | 'use'
  | 'take'
  | 'give'
  | 'examine'
  | 'wait'
  | 'system'
  | 'unknown';

export interface IntentParams {
  target?: string;
  direction?: string;
  item?: string;
  action?: string;
  extra?: Record<string, unknown>;
}

export interface IntentSegment {
  type: 'talk' | 'action' | 'thought' | 'emote' | 'sensory';
  content: string;
  sensoryType?: 'smell' | 'touch' | 'look' | 'taste' | 'listen';
  bodyPart?: string;
}

export interface DetectedIntent {
  type: IntentType;
  confidence: number;
  params?: IntentParams;
  signals?: string[];
  segments?: IntentSegment[];
}

export interface IntentDetectionPromptSnapshot {
  system: string;
  user: string;
}

export interface IntentDetectionDebug {
  detector: string;
  model?: string;
  prompt?: IntentDetectionPromptSnapshot;
  historyPreview?: string[];
  contextSummary?: string[];
  rawResponse?: string;
  parsed?: unknown;
  warnings?: string[];
}

export type AgentType = 'map' | 'npc' | 'rules' | 'parser' | 'sensory' | 'custom';

export interface AgentEvent {
  type: string;
  payload: Record<string, unknown>;
  source: AgentType;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface AgentDiagnostics {
  executionTimeMs?: number;
  tokenUsage?: TokenUsage;
  warnings?: string[];
  debug?: Record<string, unknown>;
}

export interface AgentOutput {
  narrative: string;
  statePatches?: JsonPatchOperation[];
  events?: AgentEvent[];
  diagnostics?: AgentDiagnostics;
  continueProcessing?: boolean;
}

export interface AgentOutputWithType {
  agentType: AgentType;
  output: AgentOutput;
}

export interface PhaseTiming {
  intentDetectionMs?: number;
  stateRecallMs?: number;
  contextRetrievalMs?: number;
  agentRoutingMs?: number;
  agentExecutionMs?: number;
  stateUpdateMs?: number;
  responseAggregationMs?: number;
}

export interface TurnMetadata {
  processingTimeMs: number;
  intent?: DetectedIntent;
  intentDebug?: IntentDetectionDebug;
  agentsInvoked: AgentType[];
  agentOutputs?: AgentOutputWithType[];
  nodesRetrieved?: number;
  phaseTiming?: PhaseTiming;
}

export interface NpcInstanceSummary {
  id: string;
  role: string;
  label: string | null;
  templateId: string;
  name?: string;
  createdAt?: string;
}

export type TurnDebugSliceVariant = 'intent' | 'prompt' | 'raw' | 'agent';

export type TurnDebugSliceBody =
  | { kind: 'text'; lines: string[] }
  | { kind: 'list'; title?: string; items: string[] }
  | { kind: 'code'; label?: string; value: string }
  | { kind: 'json'; label?: string; value: string };

export interface TurnDebugSlice {
  id: string;
  title: string;
  variant: TurnDebugSliceVariant;
  description?: string;
  body: TurnDebugSliceBody;
}

export interface SessionSummary {
  id: string;
  characterTemplateId: string;
  characterInstanceId: string | null;
  settingTemplateId: string;
  settingInstanceId: string | null;
  createdAt: string;
  characterName?: string | null;
  settingName?: string | null;
}

export type ViewMode =
  | 'home'
  | 'chat'
  | 'character-library'
  | 'setting-library'
  | 'tag-library'
  | 'item-library'
  | 'session-library'
  | 'session-builder'
  | 'character-builder'
  | 'setting-builder'
  | 'tag-builder'
  | 'item-builder'
  | 'docs';

export interface AppControllerStateSlice {
  selectedCharacterId: string | null;
  selectedSettingId: string | null;
  selectedTagIds: string[];
  currentSessionId: string | null;
  builderId: string | null;
  viewMode: ViewMode;
  creating: boolean;
  createError: string | null;
  sessionsLoading: boolean;
  sessionsError: string | null;
  sessionsData: SessionSummary[] | null;
  charactersLoading: boolean;
  charactersError: string | null;
  charactersData: CharacterSummary[] | null;
  settingsLoading: boolean;
  settingsError: string | null;
  settingsData: SettingSummary[] | null;
}

export interface AppControllerComputedState {
  sessions: SessionSummary[];
  canStart: boolean;
  activeCharacterId: string | null;
  activeSettingId: string | null;
}

export interface AppControllerActions {
  setSelectedCharacterId: Dispatch<SetStateAction<string | null>>;
  setSelectedSettingId: Dispatch<SetStateAction<string | null>>;
  setSelectedTagIds: Dispatch<SetStateAction<string[]>>;
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>;
  refreshSessions: () => void;
  refreshCharacters: () => void;
  refreshSettings: () => void;
  onStartSession: () => Promise<void>;
  handleDeleteSession: (sessionId: string) => Promise<void>;
  navigateToCharacterBuilder: (id: string | null) => void;
  navigateToSettingBuilder: (id: string | null) => void;
  navigateToTagBuilder: (id?: string | null) => void;
  navigateToItemBuilder: (id?: string | null) => void;
  navigateToCharacterLibrary: () => void;
  navigateToSettingLibrary: () => void;
  navigateToTagLibrary: () => void;
  navigateToItemLibrary: () => void;
  navigateToSessionLibrary: () => void;
  navigateToSessionBuilder: () => void;
  navigateToHome: () => void;
  selectSession: (id: string) => void;
}

export type AppControllerValue = AppControllerStateSlice &
  AppControllerComputedState &
  AppControllerActions;

export interface CharactersState {
  loading: boolean;
  error: string | null;
  data: CharacterSummary[] | null;
}

export interface UseCharactersResult extends CharactersState {
  retry: () => void;
}

export interface SettingsState {
  loading: boolean;
  error: string | null;
  data: SettingSummary[] | null;
}

export interface UseSettingsResult extends SettingsState {
  retry: () => void;
}

export interface TagSummary {
  id: string;
  name: string;
  shortDescription: string | null;
  promptText: string;
}

export interface TagsState {
  loading: boolean;
  error: string | null;
  data: TagSummary[] | null;
}

export interface UseTagsResult extends TagsState {
  retry: () => void;
}

export interface SessionsState {
  loading: boolean;
  error: string | null;
  data: SessionSummary[] | null;
}

export interface UseSessionsResult extends SessionsState {
  refresh: () => void;
}

export type SelectOption<T extends string> = '' | T;

export type HeightOption = SelectOption<Build['height']>;
export type TorsoBuildOption = SelectOption<Build['torso']>;
export type ArmsBuildOption = SelectOption<Build['arms']['build']>;
export type ArmsLengthOption = SelectOption<Build['arms']['length']>;
export type LegsLengthOption = SelectOption<Build['legs']['length']>;
export type LegsBuildOption = SelectOption<Build['legs']['build']>;

export interface ApiErrorShape {
  ok: false;
  error: unknown;
}

// Mobile UI Types
export interface MobileHeaderProps {
  onMenuToggle: () => void;
  characterName?: string | null;
  settingName?: string | null;
  hasSession: boolean;
}

export interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // Character panel
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  onEditCharacter: (id: string) => void;
  characters: CharacterSummary[];
  charactersLoading: boolean;
  charactersError: string | null;
  onRefreshCharacters: () => void;
  // Settings panel
  selectedSettingId: string | null;
  onSelectSetting: (id: string | null) => void;
  onEditSetting: (id: string) => void;
  settings: SettingSummary[];
  settingsLoading: boolean;
  settingsError: string | null;
  onRefreshSettings: () => void;
  // Tags panel
  selectedTagIds: string[];
  onToggleTag: (id: string) => void;
  onEditTags: () => void;
  // Session controls
  canStartSession: boolean;
  onStartSession: () => void;
  creating: boolean;
  createError: string | null;
  // Sessions panel
  sessions: SessionSummary[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  onRefreshSessions: () => void;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}
