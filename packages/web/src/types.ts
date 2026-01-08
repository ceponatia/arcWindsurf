import type { Dispatch, SetStateAction } from 'react';
import type { Build, ItemCategory, TagTargetType } from '@minimal-rpg/schemas';
import type { CreateFullSessionRequest } from './shared/api/client.js';
import type { UseFetchOnceResult } from './shared/hooks/useFetchOnce.js';

export interface CharacterSummary {
  id: string;
  name: string;
  summary: string;
  archetype?: string;
  tags?: string[];
  source?: 'fs' | 'db';
}

export interface SettingSummary {
  id: string;
  name: string;
  tone: string;
}

export interface PersonaSummary {
  id: string;
  name: string;
  summary: string;
  bio?: string;
  source: 'db';
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

/**
 * Speaker metadata for assistant messages, identifying which NPC is speaking.
 */
export interface Speaker {
  id: string;
  name: string;
  profilePic?: string;
  emotePic?: string;
}

export interface Message {
  role: MessageRole;
  content: string;
  createdAt: string; // ISO timestamp
  idx?: number; // Legacy/Display index OR Sequence for back-compat
  sequence?: number; // World Bus event sequence
  turnMetadata?: TurnMetadata;
  speaker?: Speaker;
}

export interface Session {
  id: string;
  name?: string | null;
  playerCharacterId: string;
  settingId: string;
  worldId?: string | null;
  status: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
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
  name?: string | null;
  playerCharacterId: string | null;
  settingId: string | null;
  characterName: string;
  settingName: string;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type ViewMode =
  | 'home'
  | 'chat'
  | 'character-library'
  | 'character-studio'
  | 'setting-library'
  | 'tag-library'
  | 'item-library'
  | 'session-library'
  | 'persona-library'
  | 'location-library'
  | 'session-builder'
  | 'setting-builder'
  | 'tag-builder'
  | 'item-builder'
  | 'persona-builder'
  | 'location-builder'
  | 'docs';

export interface AppControllerStateSlice {
  selectedCharacterId: string | null;
  selectedSettingId: string | null;
  selectedTagIds: string[];
  currentSessionId: string | null;
  builderId: string | null;
  locationMapId: string | null;
  locationSettingId: string | null;
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
  personasLoading: boolean;
  personasError: string | null;
  personasData: PersonaSummary[] | null;
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
  refreshPersonas: () => void;
  onStartSession: (characterId?: string, settingId?: string, tagIds?: string[]) => Promise<void>;
  onCreateSessionFull: (config: CreateFullSessionRequest) => Promise<string>;
  onSessionCreated: (sessionId: string) => void;
  handleDeleteSession: (sessionId: string) => Promise<void>;
  navigateToCharacterStudio: (id: string | null) => void;
  navigateToSettingBuilder: (id: string | null) => void;
  navigateToTagBuilder: (id?: string | null) => void;
  navigateToItemBuilder: (id?: string | null) => void;
  navigateToPersonaBuilder: (id?: string | null) => void;
  navigateToLocationLibrary: () => void;
  navigateToLocationBuilder: (params?: { mapId?: string; settingId?: string } | null) => void;
  navigateToCharacterLibrary: () => void;
  navigateToSettingLibrary: () => void;
  navigateToTagLibrary: () => void;
  navigateToItemLibrary: () => void;
  navigateToPersonaLibrary: () => void;
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

export type UseCharactersResult = UseFetchOnceResult<CharacterSummary[]>;

export interface SettingsState {
  loading: boolean;
  error: string | null;
  data: SettingSummary[] | null;
}

export type UseSettingsResult = UseFetchOnceResult<SettingSummary[]>;

export interface TagSummary {
  id: string;
  name: string;
  shortDescription: string | null;
  promptText: string;
  targetType: TagTargetType;
}

export interface TagsState {
  loading: boolean;
  error: string | null;
  data: TagSummary[] | null;
}

export type UseTagsResult = UseFetchOnceResult<TagSummary[]>;

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

// Phase 7: Frontend Reactivity Types
import { type Signal } from '@preact/signals-react';

export type StreamStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface StreamEvent {
  readonly type: string;
  readonly timestamp?: string | number | Date;
  readonly [key: string]: unknown;
}

export interface ActorDebugState {
  readonly locationId?: string | undefined;
  readonly hpPercent?: number | undefined;
}

export interface SignalStore {
  session: {
    status: Signal<StreamStatus>;
    id: Signal<string | null>;
    turnKey: Signal<number>;
  };
  actors: {
    states: Signal<Record<string, ActorDebugState>>;
    activeIds: Signal<string[]>;
  };
  events: {
    log: Signal<StreamEvent[]>;
    lastEvent: Signal<StreamEvent | null>;
  };
  ui: {
    viewMode: Signal<ViewMode>;
    overlayOpen: Signal<boolean>;
    selectedActorId: Signal<string | null>;
  };
}
