import { describe, it, expect, vi, beforeEach } from 'vitest';

const tx = vi.hoisted(() => ({
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}));

const mockDb = vi.hoisted(() => ({
  transaction: vi.fn(async (fn: (trx: typeof tx) => Promise<unknown>) => fn(tx)),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  delete: vi.fn().mockReturnThis(),
}));

vi.mock('../src/connection/index.js', () => ({
  drizzle: mockDb,
}));

import {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  getSessionProjection,
  updateSessionHeartbeat,
  listStaleSessionsByHeartbeat,
  listRecentSessionsByHeartbeat,
} from '../src/repositories/sessions.js';

describe('sessions repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates sessions in a transaction', async () => {
    tx.returning.mockResolvedValueOnce([{ id: 'session-1' }]);

    const result = await createSession({
      id: 'session-1',
      ownerEmail: 'owner@example.com',
      characterTemplateId: 'char-1',
      settingTemplateId: 'set-1',
    });

    expect(result).toEqual({ id: 'session-1' });
    expect(mockDb.transaction).toHaveBeenCalled();
  });

  it('gets and lists sessions', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'session-1' }]);
    const session = await getSession('session-1', 'owner@example.com');
    expect(session).toEqual({ id: 'session-1' });

    mockDb.orderBy.mockResolvedValueOnce([{ id: 'session-2' }]);
    const list = await listSessions('owner@example.com');
    expect(list).toEqual([{ id: 'session-2' }]);
  });

  it('deletes sessions', async () => {
    await deleteSession('session-1', 'owner@example.com');
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('gets session projection', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'projection-1' }]);
    const projection = await getSessionProjection('session-1');
    expect(projection).toEqual({ id: 'projection-1' });
  });

  it('updates session heartbeat', async () => {
    const now = new Date('2026-01-29T00:00:00.000Z');
    mockDb.returning.mockResolvedValueOnce([{ id: 'session-1', lastHeartbeatAt: now }]);

    const result = await updateSessionHeartbeat('session-1', now);

    expect(mockDb.update).toHaveBeenCalled();
    expect(result).toEqual({ id: 'session-1', lastHeartbeatAt: now });
  });

  it('lists stale sessions by heartbeat', async () => {
    mockDb.where.mockResolvedValueOnce([{ id: 'session-1', lastHeartbeatAt: null }]);

    const result = await listStaleSessionsByHeartbeat(new Date('2026-01-29T00:00:00.000Z'));

    expect(result).toEqual([{ id: 'session-1', lastHeartbeatAt: null }]);
  });

  it('lists recent sessions by heartbeat', async () => {
    const now = new Date('2026-01-29T00:00:00.000Z');
    mockDb.where.mockResolvedValueOnce([{ id: 'session-2', lastHeartbeatAt: now }]);

    const result = await listRecentSessionsByHeartbeat(now);

    expect(result).toEqual([{ id: 'session-2', lastHeartbeatAt: now }]);
  });
});
