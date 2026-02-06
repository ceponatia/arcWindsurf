import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fsMocks = vi.hoisted(() => ({
  statSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    statSync: fsMocks.statSync,
    readFileSync: fsMocks.readFileSync,
    promises: fsMocks.promises,
  },
  statSync: fsMocks.statSync,
  readFileSync: fsMocks.readFileSync,
  promises: fsMocks.promises,
}));

const { deleteCharacterFile, resolveDataDir } = await import('../../src/loaders/loader.js');

const originalEnv = process.env;

function setEnv(next: Record<string, string | undefined>): void {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
  process.env = env;
}

describe('loaders/loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv({ DATA_DIR: undefined });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('prefers explicit dataDir over env', () => {
    setEnv({ DATA_DIR: '/from-env' });

    const resolved = resolveDataDir('./from-arg');

    expect(resolved).toBe(path.resolve('./from-arg'));
  });

  it('uses DATA_DIR when no argument is provided', () => {
    setEnv({ DATA_DIR: '/from-env' });

    const resolved = resolveDataDir();

    expect(resolved).toBe(path.resolve('/from-env'));
  });

  it('deletes the first matching character file', async () => {
    const baseDir = '/data';
    fsMocks.promises.readdir.mockResolvedValue(['a.json', 'b.json']);
    fsMocks.promises.readFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('a.json')) {
        return JSON.stringify({ id: 'nope' });
      }
      return JSON.stringify({ id: 'target-id' });
    });

    const deleted = await deleteCharacterFile('target-id', baseDir);

    expect(deleted).toBe(true);
    expect(fsMocks.promises.unlink).toHaveBeenCalledWith(
      path.join(baseDir, 'characters', 'b.json')
    );
  });

  it('ignores invalid json when searching for a match', async () => {
    const baseDir = '/data';
    fsMocks.promises.readdir.mockResolvedValue(['a.json', 'b.json']);
    fsMocks.promises.readFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('a.json')) {
        return '{invalid-json';
      }
      return JSON.stringify({ id: 'other-id' });
    });

    const deleted = await deleteCharacterFile('target-id', baseDir);

    expect(deleted).toBe(false);
    expect(fsMocks.promises.unlink).not.toHaveBeenCalled();
  });
});
