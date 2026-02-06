import type { Stats } from 'node:fs';
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

const schemaMocks = vi.hoisted(() => ({
  characterSafeParse: vi.fn(),
  settingSafeParse: vi.fn(),
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

vi.mock('@minimal-rpg/schemas', () => ({
  CharacterProfileSchema: { safeParse: schemaMocks.characterSafeParse },
  SettingProfileSchema: { safeParse: schemaMocks.settingSafeParse },
}));

const { deleteCharacterFile, resolveDataDir, loadData } = await import(
  '../../src/loaders/loader.js'
);

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
    schemaMocks.characterSafeParse.mockReturnValue({
      success: true,
      data: { id: 'character-1' },
    });
    schemaMocks.settingSafeParse.mockReturnValue({
      success: true,
      data: { id: 'setting-1' },
    });
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

  it('returns false when deletion encounters a filesystem error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fsMocks.promises.readdir.mockRejectedValue(new Error('disk failure'));

    const deleted = await deleteCharacterFile('target-id', '/data');

    expect(deleted).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to delete character file for id target-id: disk failure'
    );
    errorSpy.mockRestore();
  });

  it('loads character and setting data from disk', async () => {
    fsMocks.promises.readdir.mockImplementation(async (folder: string) => {
      if (folder.endsWith(path.join('data', 'characters'))) {
        return ['hero.json'];
      }
      if (folder.endsWith(path.join('data', 'settings'))) {
        return ['world.json'];
      }
      return [];
    });
    fsMocks.promises.readFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('hero.json')) {
        return JSON.stringify({ id: 'hero' });
      }
      return JSON.stringify({ id: 'world' });
    });
    schemaMocks.characterSafeParse.mockReturnValue({
      success: true,
      data: { id: 'hero' },
    });
    schemaMocks.settingSafeParse.mockReturnValue({
      success: true,
      data: { id: 'world' },
    });

    const result = await loadData('/data');

    expect(result.characters).toEqual([{ id: 'hero' }]);
    expect(result.settings).toEqual([{ id: 'world' }]);
  });

  it('treats missing folders as empty lists', async () => {
    fsMocks.promises.readdir.mockImplementation(async () => {
      const error = new Error('missing folder') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    const result = await loadData('/data');

    expect(result.characters).toEqual([]);
    expect(result.settings).toEqual([]);
  });

  it('exits when a JSON file is invalid', async () => {
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {
        throw new Error('process-exit');
      }) as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    fsMocks.promises.readdir.mockResolvedValue(['broken.json']);
    fsMocks.promises.readFile.mockResolvedValue('{oops');

    await expect(loadData('/data')).rejects.toThrow('process-exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('exits when schema validation fails', async () => {
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {
        throw new Error('process-exit');
      }) as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    fsMocks.promises.readdir.mockResolvedValue(['hero.json']);
    fsMocks.promises.readFile.mockResolvedValue(JSON.stringify({ id: 'hero' }));
    schemaMocks.characterSafeParse.mockReturnValue({
      success: false,
      error: { format: () => ({ id: 'missing' }) },
    });

    await expect(loadData('/data')).rejects.toThrow('process-exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('defaults to the nearest data directory when no inputs are set', async () => {
    vi.resetModules();
    setEnv({ DATA_DIR: undefined });

    const cwd = process.cwd();
    const expected = path.join(cwd, 'data');
    fsMocks.statSync.mockImplementation((candidate: string) => {
      if (candidate === expected) {
        return { isDirectory: () => true } as Stats;
      }
      throw new Error('not found');
    });

    const { resolveDataDir: resolveWithDefault } = await import('../../src/loaders/loader.js');

    expect(resolveWithDefault()).toBe(expected);
  });
});
