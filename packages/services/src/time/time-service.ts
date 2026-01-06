import { worldBus } from '@minimal-rpg/bus';
import { type Events } from '@minimal-rpg/schemas';

/**
 * Time Service
 * 
 * Manages the world clock and emits TICK events.
 */
export class TimeService {
  private tickInterval: NodeJS.Timeout | null = null;
  private currentTick = 0;
  private intervalMs = 1000; // Default 1s per tick

  /**
   * Start the world clock.
   */
  start(intervalMs = 1000): void {
    if (this.tickInterval) return;
    
    this.intervalMs = intervalMs;
    this.tickInterval = setInterval(() => {
      this.emitTick();
    }, this.intervalMs);
  }

  /**
   * Stop the world clock.
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Manually emit a tick.
   */
  async emitTick(): Promise<void> {
    this.currentTick++;
    
    const event: any = {
      type: 'TICK',
      tick: this.currentTick,
      timestamp: new Date(),
    };

    await worldBus.emit(event);
  }

  getCurrentTick(): number {
    return this.currentTick;
  }
}

export const timeService = new TimeService();
