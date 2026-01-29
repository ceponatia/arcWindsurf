const DEFAULT_MONITOR_INTERVAL_MS = 30_000;

export interface PresenceRecord {
  sessionId: string;
  lastHeartbeatAt: Date;
}

export interface PresenceScheduler {
  stopWorldTick: (sessionId: string) => Promise<void> | void;
}

export interface PresenceTracker {
  listSessions: () => PresenceRecord[];
  removeSession: (sessionId: string) => void;
}

export interface HeartbeatMonitorConfig {
  presence: PresenceTracker;
  scheduler: PresenceScheduler;
  pauseThresholdMs: number;
  intervalMs?: number;
  now?: () => Date;
}

/**
 * Periodically pauses sessions that have not sent heartbeats recently.
 */
export class HeartbeatMonitor {
  private readonly presence: PresenceTracker;
  private readonly scheduler: PresenceScheduler;
  private readonly pauseThresholdMs: number;
  private readonly intervalMs: number;
  private readonly now: () => Date;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: HeartbeatMonitorConfig) {
    this.presence = config.presence;
    this.scheduler = config.scheduler;
    this.pauseThresholdMs = config.pauseThresholdMs;
    this.intervalMs = config.intervalMs ?? DEFAULT_MONITOR_INTERVAL_MS;
    this.now = config.now ?? (() => new Date());
  }

  /**
   * Start the heartbeat monitor interval.
   */
  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      void this.checkOnce();
    }, this.intervalMs);
    console.info('[HeartbeatMonitor] Started');
  }

  /**
   * Stop the heartbeat monitor interval.
   */
  stop(): void {
    if (!this.intervalId) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    console.info('[HeartbeatMonitor] Stopped');
  }

  /**
   * Run a single heartbeat check.
   */
  async checkOnce(): Promise<void> {
    const now = this.now();
    const sessions = this.presence.listSessions();

    for (const session of sessions) {
      const msSinceHeartbeat = now.getTime() - session.lastHeartbeatAt.getTime();
      if (msSinceHeartbeat <= this.pauseThresholdMs) continue;

      await this.scheduler.stopWorldTick(session.sessionId);
      this.presence.removeSession(session.sessionId);
      console.info(
        `[HeartbeatMonitor] Paused session ${session.sessionId} after ${msSinceHeartbeat}ms without heartbeat`
      );
    }
  }
}
