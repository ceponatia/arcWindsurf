import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

function mockChain<T>(result: T) {
  dbMocks.select.mockReturnThis();
  dbMocks.from.mockReturnThis();
  dbMocks.where.mockReturnThis();
  dbMocks.orderBy.mockReturnThis();
  dbMocks.limit.mockResolvedValue(result);
  dbMocks.insert.mockReturnThis();
  dbMocks.values.mockReturnThis();
  dbMocks.returning.mockResolvedValue(result);
  dbMocks.update.mockReturnThis();
  dbMocks.set.mockReturnThis();
  dbMocks.delete.mockReturnThis();
}

vi.mock('../src/connection/index.js', () => ({
  drizzle: dbMocks,
  db: dbMocks,
}));

import {
  listWorkspaceDrafts,
  getWorkspaceDraft,
  createWorkspaceDraft,
  updateWorkspaceDraft,
  deleteWorkspaceDraft,
  pruneOldWorkspaceDrafts,
} from '../src/repositories/workspace-drafts.js';

describe('workspace drafts repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists drafts with default limit', async () => {
    mockChain([{ id: 'draft-1' }]);

    const result = await listWorkspaceDrafts('user-1');

    expect(result).toEqual([{ id: 'draft-1' }]);
    expect(dbMocks.limit).toHaveBeenCalledWith(20);
  });

  it('gets a draft by id', async () => {
    mockChain([{ id: 'draft-1' }]);

    const result = await getWorkspaceDraft('draft-1');

    expect(result).toEqual({ id: 'draft-1' });
  });

  it('creates a draft and throws when missing row', async () => {
    mockChain([{ id: 'draft-2' }]);

    const created = await createWorkspaceDraft({ userId: 'user-1', name: 'Draft' });
    expect(created).toEqual({ id: 'draft-2' });

    dbMocks.returning.mockResolvedValueOnce([]);
    await expect(createWorkspaceDraft({ userId: 'user-1' })).rejects.toThrow(
      'failed to create workspace draft'
    );
  });

  it('updates drafts and returns null when missing', async () => {
    mockChain([{ id: 'draft-3' }]);

    const updated = await updateWorkspaceDraft('draft-3', { name: 'Updated' });
    expect(updated).toEqual({ id: 'draft-3' });

    dbMocks.returning.mockResolvedValueOnce([]);
    const missing = await updateWorkspaceDraft('draft-4', { name: 'Updated' });
    expect(missing).toBeNull();
  });

  it('deletes drafts', async () => {
    mockChain([{ id: 'draft-1' }]);

    const deleted = await deleteWorkspaceDraft('draft-1');
    expect(deleted).toBe(true);

    dbMocks.returning.mockResolvedValueOnce([]);
    const missing = await deleteWorkspaceDraft('draft-2');
    expect(missing).toBe(false);
  });

  it('prunes old drafts', async () => {
    mockChain([{ id: 'draft-1' }, { id: 'draft-2' }]);

    const count = await pruneOldWorkspaceDrafts(7);
    expect(count).toBe(2);
  });
});
