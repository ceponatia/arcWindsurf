import { describe, it, expect, vi, beforeEach } from 'vitest';

const query = vi.hoisted(() => ({
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockResolvedValue([{ id: 'loc-1' }]),
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

import { createLocation, getLocation, listLocations, updateLocation } from '../src/repositories/locations.js';

describe('locations repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates and updates locations', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'loc-1' }]);
    const created = await createLocation({ name: 'Location' });
    expect(created).toEqual({ id: 'loc-1' });

    mockDb.returning.mockResolvedValueOnce([{ id: 'loc-1', name: 'Updated' }]);
    const updated = await updateLocation('loc-1', { name: 'Updated' });
    expect(updated).toEqual({ id: 'loc-1', name: 'Updated' });
  });

  it('gets and lists locations', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'loc-1' }]);
    const fetched = await getLocation('loc-1');
    expect(fetched).toEqual({ id: 'loc-1' });

    const list = await listLocations({ ownerEmail: 'owner@example.com' });
    expect(list).toEqual([{ id: 'loc-1' }]);
  });
});
