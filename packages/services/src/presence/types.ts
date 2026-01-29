export type PresenceStatus = 'running' | 'resumed';

export interface PresenceRecord {
  sessionId: string;
  lastHeartbeatAt: Date;
}

export interface PresenceScheduler {
  startWorldTick: (sessionId: string) => Promise<void> | void;
  stopWorldTick: (sessionId: string) => Promise<void> | void;
}

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
