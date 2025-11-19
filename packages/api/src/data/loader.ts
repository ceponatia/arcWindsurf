import fs from 'node:fs';
import path from 'node:path';
import { CharacterProfileSchema, SettingProfileSchema } from '@minimal-rpg/schemas';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import type { LoadedData } from '../types.js';

// Narrowed view of process.env for this loader
interface LoaderEnv extends NodeJS.ProcessEnv {
  DATA_DIR?: string;
}

const env = process.env as LoaderEnv;

// Returns the closest ancestor folder that contains a `data` directory
function findNearestDataDir(startDir: string): string | null {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, 'data');
    try {
      const stat = fs.statSync(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // ignore - candidate does not exist
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

// Default base: try to find nearest ancestor `data` directory (monorepo root)
const DEFAULT_DATA_DIR = (() => {
  const repoData = findNearestDataDir(process.cwd());
  return repoData ?? path.resolve(process.cwd(), 'data');
})();

export function resolveDataDir(dataDir?: string): string {
  return dataDir
    ? path.resolve(dataDir)
    : env.DATA_DIR
      ? path.resolve(env.DATA_DIR)
      : DEFAULT_DATA_DIR;
}

export async function deleteCharacterFile(id: string, dataDir?: string): Promise<boolean> {
  const base = resolveDataDir(dataDir);
  const charactersDir = path.join(base, 'characters');
  try {
    const files = await fs.promises.readdir(charactersDir);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const p = path.join(charactersDir, f);
      const raw = await fs.promises.readFile(p, 'utf-8');
      try {
        const parsed: unknown = JSON.parse(raw);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          (parsed as { id?: unknown }).id === id
        ) {
          await fs.promises.unlink(p);
          return true;
        }
      } catch {
        // ignore invalid json during search
      }
    }
  } catch (err) {
    console.error(`Failed to delete character file for id ${id}: ${(err as Error).message}`);
  }
  return false;
}

export async function loadData(dataDir?: string): Promise<LoadedData> {
  const base = resolveDataDir(dataDir);

  const charactersDir = path.join(base, 'characters');
  const settingsDir = path.join(base, 'settings');

  interface Validator<T> {
    safeParse(
      value: unknown
    ): { success: true; data: T } | { success: false; error: { format(): unknown } };
  }

  async function loadFiles<T>(folder: string, schema: Validator<T>) {
    const results: T[] = [];
    try {
      const files = await fs.promises.readdir(folder);
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        const p = path.join(folder, f);
        const raw = await fs.promises.readFile(p, 'utf-8');
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch (err) {
          console.error(`Invalid JSON in ${p}: ${(err as Error).message}`);
          process.exit(1);
        }
        const res = schema.safeParse(parsed);
        if (!res.success) {
          console.error(`Validation failed for ${p}:`, res.error.format());
          process.exit(1);
        }
        results.push(res.data);
      }
    } catch (err) {
      // If directory doesn't exist, treat as empty list
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return results;
      }
      console.error(`Failed to read folder ${folder}: ${(err as Error).message}`);
      process.exit(1);
    }
    return results;
  }

  const characters = await loadFiles<CharacterProfile>(charactersDir, CharacterProfileSchema);
  const settings = await loadFiles<SettingProfile>(settingsDir, SettingProfileSchema);

  console.info(
    `Loaded ${characters.length} characters and ${settings.length} settings from ${base}`
  );
  const loaded: LoadedData = { characters, settings };
  return loaded;
}
