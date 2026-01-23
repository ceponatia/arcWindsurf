import { describe, it, expect, vi, beforeEach } from 'vitest';

const readFileMock = vi.fn();

vi.mock('node:fs/promises', () => ({
  readFile: readFileMock,
}));

/**
 * Import getVersion after mocking fs.
 */
async function loadGetVersion(): Promise<{ getVersion: () => Promise<string> }> {
  return await import('../../src/utils/version.js');
}

describe('utils/version', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns version from package.json', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({ version: '9.9.9' }));

    const { getVersion } = await loadGetVersion();
    const version = await getVersion();

    expect(version).toBe('9.9.9');
  });

  it('returns default when version missing', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({ name: 'app' }));

    const { getVersion } = await loadGetVersion();
    const version = await getVersion();

    expect(version).toBe('0.0.0');
  });

  it('returns default when readFile fails', async () => {
    readFileMock.mockRejectedValue(new Error('missing'));

    const { getVersion } = await loadGetVersion();
    const version = await getVersion();

    expect(version).toBe('0.0.0');
  });
});
