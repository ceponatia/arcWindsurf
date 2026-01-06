import { type WorldEvent } from '@minimal-rpg/schemas';
import { pubRedis, subRedis } from '../core/redis-client.js';

export type EventHandler = (event: WorldEvent) => void | Promise<void>;

export class RedisPubSubAdapter {
  private readonly channel = 'world-events';
  private handlers = new Set<EventHandler>();
  private isSubscribed = false;

  async publish(event: WorldEvent): Promise<void> {
    await pubRedis.publish(this.channel, JSON.stringify(event));
  }

  async subscribe(handler: EventHandler): Promise<void> {
    this.handlers.add(handler);

    if (!this.isSubscribed) {
      await subRedis.subscribe(this.channel);
      subRedis.on('message', (channel, message) => {
        if (channel === this.channel) {
          try {
            const event = JSON.parse(message) as WorldEvent;
            for (const h of this.handlers) {
              const result = h(event);
              if (result instanceof Promise) {
                result.catch((err: Error) => console.error('Error in event handler', err));
              }
            }
          } catch (err) {
            console.error('Failed to parse Redis event message', err);
          }
        }
      });
      this.isSubscribed = true;
    }
  }

  unsubscribe(handler: EventHandler): void {
    this.handlers.delete(handler);
  }
}

export const redisPubSub = new RedisPubSubAdapter();
