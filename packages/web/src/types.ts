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
  characterId: string;
  settingId: string;
  createdAt: string; // ISO timestamp
  messages: Message[];
}

export interface SessionSummary {
  id: string;
  characterId: string;
  settingId: string;
  createdAt: string;
  characterName?: string | null;
  settingName?: string | null;
}

export type SelectOption<T extends string> = '' | T;

export type AppearanceMode = 'free' | 'structured';

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
