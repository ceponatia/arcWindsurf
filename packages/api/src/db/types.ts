import type { getDbOverview, getDbPathInfo } from '@minimal-rpg/db/node';
import type { ConversationMessageRole } from '@minimal-rpg/schemas';
import type { SessionHistoryEntry, StateChangeLogEntry } from '@minimal-rpg/schemas';

export interface DbMessage {
  role: ConversationMessageRole;
  content: string;
  createdAt: string;
  idx: number;
  /** Speaker metadata for assistant messages */
  speaker?: {
    actorId: string;
    name?: string;
  };
}

export type { SessionHistoryEntry, StateChangeLogEntry };

export interface DbSession {
  id: string;
  playerCharacterId: string;
  settingId: string;
  createdAt: string;
  eventSeq: number;
}

export type DbSessionSummary = Pick<
  DbSession,
  'id' | 'playerCharacterId' | 'settingId' | 'createdAt' | 'eventSeq'
>;

// Admin DB types (aliases to external return shapes)
export type AdminDbOverview = Awaited<ReturnType<typeof getDbOverview>>;
export type AdminDbPathInfo = Awaited<ReturnType<typeof getDbPathInfo>>;
