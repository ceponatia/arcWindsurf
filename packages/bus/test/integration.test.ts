import { describe, it, expect, beforeAll } from 'vitest';
import {
  worldBus,
  telemetryMiddleware,
  persistenceMiddleware,
  registerPersistenceHandler,
} from '@minimal-rpg/bus';
import type { WorldEvent } from '@minimal-rpg/schemas';

describe('Phase 1 & 2 Integration', () => {
  const capturedEvents: WorldEvent[] = [];

  beforeAll(() => {
    // Register a test persistence handler
    registerPersistenceHandler(async (event: WorldEvent) => {
      capturedEvents.push(event);
    });

    // Add middleware
    worldBus.use(telemetryMiddleware);
    worldBus.use(persistenceMiddleware);
  });

  it('should emit and persist TICK events', async () => {
    const tickEvent: WorldEvent = {
      type: 'TICK',
      tick: 1,
      timestamp: new Date(),
    };

    await worldBus.emit(tickEvent);

    // Give async handlers time to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0]?.type).toBe('TICK');
  });

  it('should emit and persist MOVE_INTENT events', async () => {
    const moveIntent: WorldEvent = {
      type: 'MOVE_INTENT',
      destinationId: 'tavern',
    };

    await worldBus.emit(moveIntent);

    // Give async handlers time to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(capturedEvents.length).toBeGreaterThan(1);
    const lastEvent = capturedEvents[capturedEvents.length - 1];
    expect(lastEvent?.type).toBe('MOVE_INTENT');
  });

  it('should subscribe to events via WorldBus', async () => {
    const receivedEvents: WorldEvent[] = [];

    const handler = (event: WorldEvent) => {
      receivedEvents.push(event);
    };

    await worldBus.subscribe(handler);

    const speakIntent: WorldEvent = {
      type: 'SPEAK_INTENT',
      content: 'Hello, world!',
    };

    await worldBus.emit(speakIntent);

    // Give async handlers time to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]?.type).toBe('SPEAK_INTENT');

    worldBus.unsubscribe(handler);
  });
});
