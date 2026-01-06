import { worldBus } from '@minimal-rpg/bus';

/**
 * Tick Emitter
 *
 * Source of TICK events for the WorldBus.
 */
export class TickEmitter {
  private interval: NodeJS.Timeout | null = null;
  private currentTick = 0;

  start(intervalMs = 1000) {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.currentTick++;
      void worldBus.emit({
        type: 'TICK',
        tick: this.currentTick,
        timestamp: new Date()
      });
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export const tickEmitter = new TickEmitter();
