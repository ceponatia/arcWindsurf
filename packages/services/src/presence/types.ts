import type { PresenceRecord, PresenceScheduler } from '@minimal-rpg/schemas';

export type PresenceStatus = 'running' | 'resumed';

export type { PresenceRecord, PresenceScheduler };

export interface PresenceServiceConfig {
  scheduler?: PresenceScheduler;
  now?: () => Date;
  pauseThresholdMs?: number;
}

export interface RecordHeartbeatResult {
  sessionId: string;
  status: PresenceStatus;
  lastHeartbeatAt: Date;
}
