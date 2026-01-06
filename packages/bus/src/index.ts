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
    let index = 0;
    const next = async (): Promise<void> => {
      const middleware = this.middlewares[index++];
      if (middleware) {
        await middleware(event, next);
      } else {
        await redisPubSub.publish(event);
      }
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
