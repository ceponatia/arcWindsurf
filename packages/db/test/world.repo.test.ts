import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}));

vi.mock('../src/connection/index.js', () => ({
  drizzle: mockDb,
}));

import {
  createLocationMap,
  getLocationMap,
  listLocationMaps,
  updateLocationMap,
  deleteLocationMap,
  createLocationPrefab,
  getLocationPrefab,
  listLocationPrefabs,
} from '../src/repositories/world.js';

describe('world repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates and fetches location maps', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'map-1' }]);
    const created = await createLocationMap({ name: 'Map' });
    expect(created).toEqual({ id: 'map-1' });

    mockDb.limit.mockResolvedValueOnce([{ id: 'map-1' }]);
    const fetched = await getLocationMap('map-1');
    expect(fetched).toEqual({ id: 'map-1' });
  });

  it('lists location maps with optional owner', async () => {
    mockDb.where.mockResolvedValueOnce([{ id: 'map-1' }]);
    const result = await listLocationMaps('owner@example.com');
    expect(result).toEqual([{ id: 'map-1' }]);
  });

  it('updates and deletes location maps', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'map-1', name: 'Updated' }]);
    const updated = await updateLocationMap('map-1', { name: 'Updated' });
    expect(updated).toEqual({ id: 'map-1', name: 'Updated' });

    mockDb.returning.mockResolvedValueOnce([{ id: 'map-1' }]);
    const deleted = await deleteLocationMap('map-1');
    expect(deleted).toBe(true);
  });

  it('creates and fetches location prefabs', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'prefab-1' }]);
    const created = await createLocationPrefab({ name: 'Prefab' });
    expect(created).toEqual({ id: 'prefab-1' });

    mockDb.limit.mockResolvedValueOnce([{ id: 'prefab-1' }]);
    const fetched = await getLocationPrefab('prefab-1');
    expect(fetched).toEqual({ id: 'prefab-1' });
  });

  it('lists location prefabs by category', async () => {
    mockDb.where.mockResolvedValueOnce([{ id: 'prefab-1' }]);
    const result = await listLocationPrefabs('indoors');
    expect(result).toEqual([{ id: 'prefab-1' }]);
  });
});
