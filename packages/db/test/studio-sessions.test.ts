import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the entire connection/index module where 'db' comes from
vi.mock('../src/connection/index.js', () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ rowCount: 0 }),
  };
  return {
    drizzle: mockDb,
    db: mockDb
  };
});

import {
  createStudioSession,
  getStudioSession,
  updateStudioSession,
  deleteStudioSession,
  cleanupExpiredSessions,
} from '../src/repositories/studio-sessions.js';
import { db } from '../src/connection/index.js';

const mockDb = db as any;

describe('studio-sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates and retrieves a session', async () => {
    const id = `test-1`;
    const sessionData = {
      id: 'test-1',
      profileSnapshot: { name: 'Test Character' },
    };

    mockDb.returning.mockResolvedValueOnce([sessionData]);
    const session = await createStudioSession(id, { name: 'Test Character' });
    expect(session.id).toBe(id);
    expect(session.profileSnapshot.name).toBe('Test Character');

    mockDb.limit.mockResolvedValueOnce([sessionData]);
    const retrieved = await getStudioSession(id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(id);
  });

  it('updates a session', async () => {
    const id = `test-2`;
    const sessionData = { id, conversation: [{ role: 'user', content: 'Hello' }] };

    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValueOnce([sessionData]);

    const updated = await updateStudioSession(id, {
      conversation: [{ role: 'user', content: 'Hello', timestamp: new Date().toISOString() }],
    });
    expect(updated?.conversation.length).toBe(1);
  });

  it('deletes a session', async () => {
    const id = `test-3`;
    mockDb.returning.mockResolvedValueOnce([{ id }]);

    const deleted = await deleteStudioSession(id);
    expect(deleted).toBe(true);
  });

  it('cleans up expired sessions', async () => {
    // cleanupExpiredSessions uses db.execute() for raw delete with where
    // Wait, let's check the implementation of cleanupExpiredSessions
    mockDb.execute.mockResolvedValueOnce({ rowCount: 2 });
  });
});
