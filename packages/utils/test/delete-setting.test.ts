import { describe, it, expect, vi, afterEach } from 'vitest';
import { deleteSettingFromDb } from '../src/settings/delete-setting.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('deleteSettingFromDb', () => {
  it('returns true on 204', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 204, text: async () => '' })));
    await expect(deleteSettingFromDb('abc', 'http://example.com')).resolves.toBe(true);
  });

  it('throws on 405', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 405, text: async () => 'Nope' })));
    await expect(deleteSettingFromDb('abc', 'http://example.com')).rejects.toThrow('Nope');
  });

  it('throws on other status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 500, text: async () => '' })));
    await expect(deleteSettingFromDb('abc', 'http://example.com')).rejects.toThrow(
      'Delete failed with status 500'
    );
  });
});
