import fs from 'node:fs';
import path from 'node:path';

interface LoaderEnv extends NodeJS.ProcessEnv {
  DATA_DIR?: string;
}

const env = process.env as LoaderEnv;

function findNearestDataDir(startDir: string): string | null {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, 'data');
    try {
      const stat = fs.statSync(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // ignore missing path
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

const DEFAULT_DATA_DIR = (() => {
  const repoData = findNearestDataDir(process.cwd());
  return repoData ?? path.resolve(process.cwd(), 'data');
})();

export function resolveDataDir(dataDir?: string): string {
  const dir = dataDir?.trim();
  if (dir) return path.resolve(dir);

  const envDir = env.DATA_DIR?.trim();
  if (envDir) return path.resolve(envDir);

  return DEFAULT_DATA_DIR;
}
