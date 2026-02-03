export interface PresenceRecord {
  sessionId: string;
  lastHeartbeatAt: Date;
}

export interface PresenceScheduler {
  startWorldTick: (sessionId: string) => Promise<void> | void;
  stopWorldTick: (sessionId: string) => Promise<void> | void;
}

export type PresenceSchedulerStopOnly = Pick<PresenceScheduler, 'stopWorldTick'>;
