import { type WorldEvent } from '@minimal-rpg/schemas';
import { redisPubSub, type EventHandler } from './adapters/redis-pubsub.js';
import { type BusMiddleware } from './middleware/telemetry.js';

export type WorldBusHandler = EventHandler;
export type { WorldEvent };

/**
 * The World Bus is the central nervous system of the simulation.
 * It facilitates event-driven communication between agents and system services.
 * This version uses Redis for distributed pub/sub and supports middleware.
 */
export class WorldBus {
  private middlewares: BusMiddleware[] = [];

  /**
   * Add middleware to the bus.
   */
  use(middleware: BusMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Emit an event to the bus, running it through all middleware.
   */
  async emit(event: WorldEvent): Promise<void> {
    const queue = [...this.middlewares];
    const next = async (): Promise<void> => {
      const middleware = queue.shift();
      if (!middleware) {
        await redisPubSub.publish(event);
        return;
      }
      await middleware(event, next);
    };
    await next();
  }

  /**
   * Subscribe to events on the bus.
   */
  async subscribe(handler: WorldBusHandler): Promise<void> {
    await redisPubSub.subscribe(handler);
  }

  /**
   * Remove a subscriber.
   */
  unsubscribe(handler: WorldBusHandler): void {
    redisPubSub.unsubscribe(handler);
  }
}

export const worldBus = new WorldBus();
export * from './adapters/redis-pubsub.js';
export * from './core/redis-client.js';
export * from './middleware/telemetry.js';
export * from './middleware/persistence.js';
