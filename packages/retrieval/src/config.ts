import path from 'node:path';

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');

/**
 * Resolve the data directory for retrieval assets.
 *
 * @param {string | undefined} dataDirOverride Optional override for the data directory.
 * @returns {string} The resolved data directory path.
 */
export function resolveDataDir(dataDirOverride?: string): string {
  const dir = dataDirOverride?.trim();
  if (dir) return path.resolve(dir);

  const envDir = process.env['DATA_DIR']?.trim();
  if (envDir) return path.resolve(envDir);

  return DEFAULT_DATA_DIR;
}
