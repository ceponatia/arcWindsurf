import { updateSessionHeartbeat } from '@minimal-rpg/db';
import type {
  PresenceRecord,
  PresenceScheduler,
  PresenceServiceConfig,
  RecordHeartbeatResult,
} from './types.js';

export const HEARTBEAT_INTERVAL_MS = 60_000;
export const PAUSE_THRESHOLD_MS = 5 * 60_000;

/**
 * Tracks session heartbeats and resumes ticks when sessions return.
 */
export class PresenceService {
  private sessions = new Map<string, Date>();
  private scheduler: PresenceScheduler | undefined;
  private now: () => Date;
  private pauseThresholdMs: number;

  constructor(config?: PresenceServiceConfig) {
    this.scheduler = config?.scheduler;
    this.now = config?.now ?? (() => new Date());
    this.pauseThresholdMs = config?.pauseThresholdMs ?? PAUSE_THRESHOLD_MS;
  }

  /**
   * Inject the scheduler used to resume world ticks.
   */
  setScheduler(scheduler: PresenceScheduler | undefined): void {
    this.scheduler = scheduler;
  }

  /**
   * Record the latest heartbeat and resume ticks if the session was inactive.
   */
  async recordHeartbeat(sessionId: string): Promise<RecordHeartbeatResult> {
    const now = this.now();
    const previous = this.sessions.get(sessionId);
    const wasInactive =
      !previous || now.getTime() - previous.getTime() > this.pauseThresholdMs;

    this.sessions.set(sessionId, now);

    try {
      await updateSessionHeartbeat(sessionId, now);
    } catch (error) {
      console.warn('[Presence] Failed to persist heartbeat', error);
    }

    if (wasInactive && this.scheduler) {
      try {
        await this.scheduler.startWorldTick(sessionId);
      } catch (error) {
        console.warn('[Presence] Failed to resume world tick', error);
      }
      return { sessionId, status: 'resumed', lastHeartbeatAt: now };
    }

    return { sessionId, status: 'running', lastHeartbeatAt: now };
  }

  /**
   * Fetch the last heartbeat timestamp for a session.
   */
  getLastHeartbeat(sessionId: string): Date | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List all tracked sessions.
   */
  listSessions(): PresenceRecord[] {
    return Array.from(this.sessions.entries()).map(([sessionId, lastHeartbeatAt]) => ({
      sessionId,
      lastHeartbeatAt,
    }));
  }

  /**
   * Remove a session from presence tracking.
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Seed presence tracking from persisted data.
   */
  seedSession(sessionId: string, lastHeartbeatAt: Date): void {
    this.sessions.set(sessionId, lastHeartbeatAt);
  }
}

export const presenceService = new PresenceService();
