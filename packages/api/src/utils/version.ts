import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function getVersion(): Promise<string> {
  try {
    // packages/api/src/util -> root package.json (../../.. from this file)
    const here = fileURLToPath(import.meta.url);
    const rootPkg = path.resolve(here, '../../../../package.json');
    const text = await readFile(rootPkg, 'utf-8');
    const pkg = JSON.parse(text) as unknown;
    if (isPackageJson(pkg) && typeof pkg.version === 'string') {
      return pkg.version;
    }
    return '0.0.0';
  } catch {
    return '0.0.0';
  }
}

interface PackageJson {
  version?: string;
}

function isPackageJson(value: unknown): value is PackageJson {
  return Boolean(value && typeof value === 'object');
}
