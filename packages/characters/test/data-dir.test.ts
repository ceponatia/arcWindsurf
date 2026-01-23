import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const statSyncMock = vi.fn();
const resolveMock = vi.fn((...parts: string[]) => parts.join('/'));
const joinMock = vi.fn((...parts: string[]) => parts.join('/'));
const dirnameMock = vi.fn((p: string) => p.split('/').slice(0, -1).join('/') || '/');

vi.mock('node:fs', () => ({
  default: {
    statSync: statSyncMock,
  },
  statSync: statSyncMock,
}));

vi.mock('node:path', () => ({
  default: {
    resolve: resolveMock,
    join: joinMock,
    dirname: dirnameMock,
  },
  resolve: resolveMock,
  join: joinMock,
  dirname: dirnameMock,
}));

describe('resolveDataDir', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    statSyncMock.mockReset();
    resolveMock.mockClear();
    joinMock.mockClear();
    dirnameMock.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses explicit dataDir argument', async () => {
    const { resolveDataDir } = await import('../src/utils/dataDir.js');
    const result = resolveDataDir('/custom/data');

    expect(result).toBe('/custom/data');
  });

  it('uses DATA_DIR env when provided', async () => {
    process.env.DATA_DIR = '/env/data';
    const { resolveDataDir } = await import('../src/utils/dataDir.js');
    const result = resolveDataDir();

    expect(result).toBe('/env/data');
  });

  it('falls back to discovered data directory', async () => {
    statSyncMock.mockImplementation((path: string) => {
      if (path.endsWith('/data')) {
        return { isDirectory: () => true };
      }
      throw new Error('missing');
    });

    const { resolveDataDir } = await import('../src/utils/dataDir.js');
    const result = resolveDataDir();

    expect(result.endsWith('/data')).toBe(true);
  });
});
