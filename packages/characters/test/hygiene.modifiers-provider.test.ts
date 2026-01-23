import { describe, it, expect, vi, beforeEach } from 'vitest';

const readFileMock = vi.hoisted(() => vi.fn());

vi.mock('node:fs', () => ({
  default: {
    promises: {
      readFile: readFileMock,
    },
  },
  promises: {
    readFile: readFileMock,
  },
}));

vi.mock('@minimal-rpg/utils', () => ({
  parseJsonWithSchema: vi.fn((raw: string) => JSON.parse(raw)),
}));

vi.mock('../src/utils/dataDir.js', () => ({
  resolveDataDir: () => '/data',
}));

import { FileHygieneModifiersProvider } from '../src/hygiene/modifiersProvider.js';

describe('FileHygieneModifiersProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and caches data', async () => {
    readFileMock.mockResolvedValueOnce(JSON.stringify({ decayRates: {}, bodyParts: {} }));

    const provider = new FileHygieneModifiersProvider();
    const first = await provider.load();
    const second = await provider.load();

    expect(first).toEqual({ decayRates: {}, bodyParts: {} });
    expect(second).toEqual({ decayRates: {}, bodyParts: {} });
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it('throws friendly errors on read failure', async () => {
    readFileMock.mockRejectedValueOnce(new Error('missing'));

    const provider = new FileHygieneModifiersProvider({ dataDir: '/custom' });

    await expect(provider.load()).rejects.toThrow('Failed to read sensory modifiers');
  });

  it('throws friendly errors on parse failure', async () => {
    readFileMock.mockResolvedValueOnce('invalid');

    const provider = new FileHygieneModifiersProvider();

    await expect(provider.load()).rejects.toThrow('Invalid sensory modifiers data');
  });
});
