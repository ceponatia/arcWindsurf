import { describe, it, expect, vi, beforeEach } from 'vitest';

const saveEvent = vi.fn();
const getEventsForSession = vi.fn();

vi.mock('@minimal-rpg/db/node', async () => {
  return {
    saveEvent,
    getEventsForSession,
  };
});


describe('event-persistence', () => {
  beforeEach(() => {
    saveEvent.mockReset();
    getEventsForSession.mockReset();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('ignores session-less system events', async () => {
    const { persistWorldEvent } = await import('../../src/services/event-persistence.js');

    await persistWorldEvent({ type: 'SYSTEM_EVENT' } as any);

    expect(getEventsForSession).not.toHaveBeenCalled();
    expect(saveEvent).not.toHaveBeenCalled();
  });

  it('increments sequence per session starting at 0', async () => {
    getEventsForSession.mockResolvedValue([]);

    const { persistWorldEvent } = await import('../../src/services/event-persistence.js');

    await persistWorldEvent({ type: 'SPOKE', sessionId: 's1', payload: { content: 'a' } } as any);
    await persistWorldEvent({ type: 'SPOKE', sessionId: 's1', payload: { content: 'b' } } as any);

    expect(getEventsForSession).toHaveBeenCalledTimes(1);
    expect(saveEvent).toHaveBeenCalledTimes(2);

    expect(saveEvent.mock.calls[0]?.[0]).toMatchObject({ sessionId: 's1', sequence: 0n, type: 'SPOKE' });
    expect(saveEvent.mock.calls[1]?.[0]).toMatchObject({ sessionId: 's1', sequence: 1n, type: 'SPOKE' });
  });

  it('recovers sequence from historical events', async () => {
    getEventsForSession.mockResolvedValue([{ sequence: 7n }] as any);

    const { persistWorldEvent } = await import('../../src/services/event-persistence.js');

    await persistWorldEvent({ type: 'SPOKE', sessionId: 's2', payload: { content: 'a' } } as any);

    expect(getEventsForSession).toHaveBeenCalledTimes(1);
    expect(saveEvent).toHaveBeenCalledTimes(1);
    expect(saveEvent.mock.calls[0]?.[0]).toMatchObject({ sessionId: 's2', sequence: 8n, type: 'SPOKE' });
  });

  it("logs DB errors but doesn't throw", async () => {
    getEventsForSession.mockResolvedValue([]);
    saveEvent.mockRejectedValue(new Error('db down'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { persistWorldEvent } = await import('../../src/services/event-persistence.js');

    await expect(
      persistWorldEvent({ type: 'SPOKE', sessionId: 's3', payload: { content: 'a' } } as any)
    ).resolves.toBeUndefined();

    expect(errSpy).toHaveBeenCalled();
  });
});
