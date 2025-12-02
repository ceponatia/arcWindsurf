import type { Appearance, SpeechStyle } from '@minimal-rpg/schemas';

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

export type MessageRole = 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  createdAt: string; // ISO timestamp
  idx?: number;
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

export type SelectOption<T extends string> = '' | T;

export type HeightOption = SelectOption<Appearance['height']>;
export type TorsoBuildOption = SelectOption<Appearance['torso']>;
export type ArmsBuildOption = SelectOption<Appearance['arms']['build']>;
export type ArmsLengthOption = SelectOption<Appearance['arms']['length']>;
export type LegsLengthOption = SelectOption<Appearance['legs']['length']>;
export type LegsBuildOption = SelectOption<Appearance['legs']['build']>;

export type CharacterStyleOverrides = Partial<SpeechStyle>;

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
