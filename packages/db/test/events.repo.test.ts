import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([{ id: 'event-1' }]),
};

vi.mock('../src/connection/drizzle.js', () => ({
  drizzle: mockDb,
}));

import { saveEvent, getEventsForSession } from '../src/repositories/events.js';

describe('events repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves events', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'event-1' }]);

    const result = await saveEvent({
      sessionId: 'session-1',
      sequence: 1n,
      type: 'SPOKE',
      payload: {},
    });

    expect(result).toEqual({ id: 'event-1' });
  });

  it('loads events for session', async () => {
    const result = await getEventsForSession('session-1', 0n);
    expect(result).toEqual([{ id: 'event-1' }]);
  });
});
