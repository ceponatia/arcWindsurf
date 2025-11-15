import { promises as fs } from 'fs';
import path from 'path';
import type { ZodType } from 'zod';
import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
} from '@minimal-rpg/schemas';

// Narrowed view of process.env for this loader
interface LoaderEnv extends NodeJS.ProcessEnv {
  DATA_DIR?: string;
}

const env = process.env as LoaderEnv;

// Returns the closest ancestor folder that contains a `data` directory
async function findNearestDataDir(startDir: string): Promise<string | null> {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, 'data');
    try {
      const stat = await fs.stat(candidate);
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
const DEFAULT_DATA_DIR = await (async () => {
  const repoData = await findNearestDataDir(process.cwd());
  return repoData ?? path.resolve(process.cwd(), 'data');
})();

export async function loadData(dataDir?: string) {
  const base = dataDir
    ? path.resolve(dataDir)
    : env.DATA_DIR
      ? path.resolve(env.DATA_DIR)
      : DEFAULT_DATA_DIR;

  const charactersDir = path.join(base, 'characters');
  const settingsDir = path.join(base, 'settings');

  async function loadFiles<T>(folder: string, schema: ZodType<T>) {
    const results: T[] = [];
    try {
      const files = await fs.readdir(folder);
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        const p = path.join(folder, f);
        const raw = await fs.readFile(p, 'utf-8');
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
    `Loaded ${characters.length} characters and ${settings.length} settings from ${base}`,
  );
  return { characters, settings };
}

export type LoadedData = Awaited<ReturnType<typeof loadData>>;
