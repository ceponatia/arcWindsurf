export interface CharacterSummary {
  id: string;
  name: string;
  summary: string;
  tags?: string[];
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
