export interface SessionHistoryEntry {
  id: string;
  sessionId: string;
  turnIdx: number;
  ownerUserId?: string | null;
  playerInput: string;
  context?: Record<string, unknown> | null;
  debug?: Record<string, unknown> | null;
  createdAt: string;
}

export interface StateChangeLogEntry {
  id: string;
  sessionId: string;
  turnIdx: number | null;
  patchCount: number;
  modifiedPaths: string[];
  agentTypes: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}
