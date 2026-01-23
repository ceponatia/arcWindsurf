import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DialogueService } from '../src/social/dialogue-service.js';
import type { WorldEvent } from '@minimal-rpg/schemas';

const emitMock = vi.fn();
let subscribed: ((event: WorldEvent) => Promise<void>) | null = null;

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    emit: emitMock,
    subscribe: vi.fn(async (handler: (event: WorldEvent) => Promise<void>) => {
      subscribed = handler;
    }),
    unsubscribe: vi.fn(),
  },
}));

describe('DialogueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribed = null;
  });

  it('emits SPOKE for SPEAK_INTENT with sessionId', async () => {
    const service = new DialogueService();
    service.start();

    await subscribed?.({
      type: 'SPEAK_INTENT',
      actorId: 'npc-1',
      sessionId: 'session-1',
      content: 'Hi',
    } as unknown as WorldEvent);

    expect(emitMock).toHaveBeenCalled();
    const event = emitMock.mock.calls[0]?.[0] as { type: string } | undefined;
    expect(event?.type).toBe('SPOKE');
  });

  it('ignores intents without sessionId', async () => {
    const service = new DialogueService();
    service.start();

    await subscribed?.({
      type: 'SPEAK_INTENT',
      actorId: 'npc-1',
      content: 'Hi',
    } as unknown as WorldEvent);

    expect(emitMock).not.toHaveBeenCalled();
  });

  it('start/stop are idempotent', () => {
    const service = new DialogueService();
    service.start();
    service.start();
    service.stop();
    service.stop();
  });
});
