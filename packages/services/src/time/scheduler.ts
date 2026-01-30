import { worldBus } from '@minimal-rpg/bus';
import {
  getActiveSessions,
  getSessionNpcsWithSchedules,
  getSessionGameTime,
  getActorState,
  updateActorState,
} from '@minimal-rpg/db';
import type { GameTime, NpcLocationState } from '@minimal-rpg/schemas';
import { resolveNpcSchedulesBatch } from './schedule-service.js';

type ActorStateRecord = Record<string, unknown>;

/**
 * Scheduler Service
 *
 * Manages NPC schedules and recurring world events.
 */
export class Scheduler {
  private static processing = new Set<string>();
  private static started = false;

  /**
   * Process schedules for all active sessions.
   */
  static async processAllSchedules(tick: number): Promise<void> {
    const sessions = await getActiveSessions();

    await Promise.all(sessions.map((session) => this.processSchedules(session.id, tick)));
  }

  /**
   * Check schedules and emit relevant events.
   * @param sessionId - Session identifier
   * @param tick - Current game tick number
   */
  static async processSchedules(sessionId: string, tick: number): Promise<void> {
    if (this.processing.has(sessionId)) {
      console.debug(`[Scheduler] Skipping ${sessionId} - already processing`);
      return;
    }

    this.processing.add(sessionId);

    try {
      const gameTime = await getSessionGameTime(sessionId);
      if (!gameTime) {
        console.warn(`[Scheduler] No game time for session ${sessionId}`);
        return;
      }

      const npcs = await getSessionNpcsWithSchedules(sessionId);
      if (npcs.length === 0) return;

      const { locationStates, unresolved } = resolveNpcSchedulesBatch(npcs, {
        currentTime: gameTime,
      });

      if (unresolved.length > 0) {
        console.debug(`[Scheduler] Unresolved NPCs: ${unresolved.join(', ')}`);
      }

      for (const [npcId, newState] of locationStates) {
        await this.processNpcSchedule(sessionId, npcId, newState, gameTime);
      }
    } finally {
      this.processing.delete(sessionId);
    }
  }

  /**
   * Process schedule for a single NPC.
   */
  private static async processNpcSchedule(
    sessionId: string,
    npcId: string,
    newState: NpcLocationState,
    _gameTime: GameTime
  ): Promise<void> {
    const currentState = await getActorState(sessionId, npcId);
    if (!currentState) return;

    const stateRecord: ActorStateRecord =
      currentState.state && typeof currentState.state === 'object'
        ? (currentState.state as ActorStateRecord)
        : {};

    const currentLocationId = this.getCurrentLocationId(stateRecord);
    const newLocationId = newState.locationId;

    if (currentLocationId && currentLocationId !== newLocationId) {
      await worldBus.emit({
        type: 'MOVE_INTENT',
        actorId: npcId,
        fromLocationId: currentLocationId,
        toLocationId: newLocationId,
        destinationId: newLocationId,
        reason: 'schedule',
        sessionId,
        timestamp: new Date(),
      });
    }

    const currentActivity = this.getCurrentActivityType(stateRecord);
    const newActivity = newState.activity?.type;

    if (currentActivity !== newActivity) {
      await updateActorState(sessionId, npcId, {
        activity: newState.activity,
        interruptible: newState.interruptible,
        scheduleSlotId: newState.scheduleSlotId,
      });

      if (newActivity) {
        await worldBus.emit({
          type: 'NPC_ACTIVITY_CHANGED',
          actorId: npcId,
          previousActivity: currentActivity ?? undefined,
          newActivity,
          sessionId,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Subscribe to TICK events.
   */
  static start(): void {
    if (this.started) return;

    void worldBus.subscribe(async (event) => {
      if (event.type === 'TICK') {
        await this.processAllSchedules(event.tick);
      }
    });
    this.started = true;
    console.log('[Scheduler] Started - listening for TICK events');
  }

  private static getCurrentLocationId(state: ActorStateRecord): string | null {
    const locationId = state['locationId'];
    if (typeof locationId === 'string') return locationId;

    const location = state['location'];
    if (location && typeof location === 'object') {
      const currentLocationId = (location as ActorStateRecord)['currentLocationId'];
      if (typeof currentLocationId === 'string') return currentLocationId;
    }

    const locationState = state['locationState'];
    if (locationState && typeof locationState === 'object') {
      const locationStateId = (locationState as ActorStateRecord)['locationId'];
      if (typeof locationStateId === 'string') return locationStateId;
    }

    return null;
  }

  /**
   * Get the current activity type for an NPC from actor state.
   */
  private static getCurrentActivityType(state: ActorStateRecord): string | null {
    const activity = state['activity'];
    if (activity && typeof activity === 'object') {
      const typeValue = (activity as ActorStateRecord)['type'];
      if (typeof typeValue === 'string') return typeValue;
    }

    const locationState = state['locationState'];
    if (locationState && typeof locationState === 'object') {
      const activityValue = (locationState as ActorStateRecord)['activity'];
      if (activityValue && typeof activityValue === 'object') {
        const activityType = (activityValue as ActorStateRecord)['type'];
        if (typeof activityType === 'string') return activityType;
      }
    }

    return null;
  }
}
