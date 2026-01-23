import { describe, it, expect, vi, beforeEach } from 'vitest';

const query = vi.hoisted(() => ({
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockResolvedValue([{ id: 'entity-1' }]),
}));

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  $dynamic: vi.fn(() => query),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}));

vi.mock('../src/connection/index.js', () => ({
  drizzle: mockDb,
}));

import {
  createEntityProfile,
  getEntityProfile,
  listEntityProfiles,
  updateEntityProfile,
} from '../src/repositories/entity-profiles.js';

describe('entity-profiles repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates and updates entity profiles', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'entity-1' }]);
    const created = await createEntityProfile({ entityType: 'npc', name: 'NPC' });
    expect(created).toEqual({ id: 'entity-1' });

    mockDb.returning.mockResolvedValueOnce([{ id: 'entity-1', name: 'Updated' }]);
    const updated = await updateEntityProfile('entity-1', { name: 'Updated' });
    expect(updated).toEqual({ id: 'entity-1', name: 'Updated' });
  });

  it('gets and lists entity profiles', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'entity-1' }]);
    const fetched = await getEntityProfile('entity-1');
    expect(fetched).toEqual({ id: 'entity-1' });

    const list = await listEntityProfiles({ visibility: 'public' });
    expect(list).toEqual([{ id: 'entity-1' }]);
  });
});
