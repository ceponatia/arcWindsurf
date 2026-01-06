import { EventEmitter } from 'events';
import { type WorldEvent } from './events/schemas.js';

export type WorldBusHandler = (event: WorldEvent) => void | Promise<void>;

/**
 * The World Bus is the central nervous system of the simulation.
 * It facilitates event-driven communication between agents and system services.
 */
export class WorldBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Increase max listeners if needed for many agents
    this.emitter.setMaxListeners(100);
  }

  /**
   * Emit an event to the bus.
   */
  emit(event: WorldEvent): void {
    this.emitter.emit('event', event);
    // Also emit by type for easier filtering
    this.emitter.emit(`type:${event.type}`, event);
  }

  /**
   * Subscribe to all events on the bus.
   */
  onEvent(handler: WorldBusHandler): void {
    this.emitter.on('event', handler);
  }

  /**
   * Subscribe to a specific event type.
   */
  onType<T extends WorldEvent['type']>(
    type: T,
    handler: (event: Extract<WorldEvent, { type: T }>) => void
  ): void {
    this.emitter.on(`type:${type}`, handler as WorldBusHandler);
  }

  /**
   * Remove a subscriber.
   */
  offEvent(handler: WorldBusHandler): void {
    this.emitter.off('event', handler);
  }
}

export const worldBus = new WorldBus();
