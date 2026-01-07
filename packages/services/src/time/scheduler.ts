// TODO: Re-add worldBus import when schedule events are implemented:
// import { worldBus } from '@minimal-rpg/bus';

/**
 * Scheduler Service
 *
 * Manages NPC schedules and recurring world events.
 */
export class Scheduler {
  /**
   * Check schedules and emit relevant events.
   * @param tick - Current game tick number
   */
  static async processSchedules(tick: number): Promise<void> {
    // TODO: Implement schedule processing - check NPC schedules against current tick,
    // emit location change events via worldBus when NPCs need to move
    console.debug(`[Scheduler] Processing schedules for tick ${tick}`);
    await Promise.resolve();
  }
}
