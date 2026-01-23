import { describe, it, expect, vi, beforeEach } from 'vitest';

const poolQuery = vi.hoisted(() => vi.fn());

vi.mock('../src/utils/client.js', () => ({
  pool: { query: poolQuery },
  resolvedDbUrl: 'postgres://db',
}));

import { getDbPathInfo, deleteDbRow, getDbOverview } from '../src/repositories/admin.js';

describe('admin repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns db path info when connectivity works', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [{ ok: true }] });

    const info = await getDbPathInfo();

    expect(info.exists).toBe(true);
    expect(info.url).toBe('postgres://db');
  });

  it('returns db path info when connectivity fails', async () => {
    poolQuery.mockRejectedValueOnce(new Error('down'));

    const info = await getDbPathInfo();

    expect(info.exists).toBe(false);
  });

  it('deletes rows by model name', async () => {
    poolQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await deleteDbRow('userSessions', 'id-1');

    expect(poolQuery).toHaveBeenCalled();
  });

  it('throws for unknown models or missing rows', async () => {
    await expect(deleteDbRow('unknown', 'id-1')).rejects.toThrow('Unknown model');

    poolQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(deleteDbRow('messages', 'id-2')).rejects.toThrow('Not found');
  });

  it('gets db overview', async () => {
    poolQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema.columns')) {
        return {
          rows: [
            { column_name: 'id', is_nullable: 'NO', data_type: 'text' },
            { column_name: 'created_at', is_nullable: 'YES', data_type: 'timestamp' },
          ],
        };
      }
      if (sql.includes('COUNT')) {
        return { rows: [{ count: '2' }] };
      }
      return { rows: [{ id: 'row-1' }] };
    });

    const overview = await getDbOverview();

    expect(overview.tables.length).toBeGreaterThan(0);
    expect(overview.tables[0]?.rowCount).toBe(2);
  });
});
