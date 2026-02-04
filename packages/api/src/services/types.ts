import type {
  CharacterProfile,
  SettingProfile,
  WorldEvent,
  ConversationMessageRole,
} from '@minimal-rpg/schemas';
import type { Speaker } from '../types.js';
import type { DbMessage, DbSessionSummary } from '../db/types.js';

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

// Message DTO
export interface MessageResponse {
  role: ConversationMessageRole;
  content: string;
  createdAt: string;
  idx?: number;
}

// Session creation
export interface CreateSessionResponse {
  id: string;
  characterTemplateId: string;
  characterInstanceId: string | null;
  settingTemplateId: string;
  settingInstanceId: string | null;
  createdAt: string;
}

// Message append
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

// World Bus turn DTO returned by the simplified pipeline
export interface TurnResultDto {
  message: string;
  /** Speaker info for the responding NPC */
  speaker?: Speaker | undefined;
  events: WorldEvent[];
  stateChanges?: unknown;
  metadata?: Record<string, unknown>;
  success: boolean;
}

// Mapper function signatures for discoverability
export type MapSessionListItem = (
  s: DbSessionSummary,
  characterName?: string,
  settingName?: string
) => SessionListItem;
export type MapMessageResponse = (m: DbMessage) => MessageResponse;
