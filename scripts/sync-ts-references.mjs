#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, 'packages');

function readJson(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(txt);
}

function writeJsonPretty(filePath, obj) {
  // Preserve typical repo formatting: 2-space indent, trailing newline
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isWorkspaceDepVersion(version) {
  // Accept workspace:* and workspace:^ / workspace:~ patterns if you ever use them
  return typeof version === 'string' && version.startsWith('workspace:');
}

function getWorkspaceDeps(pkgJson) {
  const deps = {
    ...(pkgJson.dependencies ?? {}),
    ...(pkgJson.devDependencies ?? {}),
    ...(pkgJson.peerDependencies ?? {}),
    ...(pkgJson.optionalDependencies ?? {}),
  };

  return Object.entries(deps)
    .filter(([, v]) => isWorkspaceDepVersion(v))
    .map(([name]) => name);
}

function loadPackagesMap() {
  // Map package name -> directory (packages/<dir>)
  const map = new Map();

  if (!exists(PACKAGES_DIR)) {
    throw new Error(`Expected packages/ directory at: ${PACKAGES_DIR}`);
  }

  const dirs = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
    if (!exists(pkgPath)) continue;
    const pkg = readJson(pkgPath);
    if (pkg?.name) map.set(pkg.name, dir);
  }

  return map;
}

function normalizeReferences(tsconfig, refs) {
  // Ensure stable ordering, stable shape
  tsconfig.references = refs.map((p) => ({ path: p }));
  return tsconfig;
}

function main() {
  const nameToDir = loadPackagesMap();

  const packageDirs = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let changedCount = 0;
  const warnings = [];

  for (const dir of packageDirs) {
    const pkgJsonPath = path.join(PACKAGES_DIR, dir, 'package.json');
    const tsconfigPath = path.join(PACKAGES_DIR, dir, 'tsconfig.json');

    if (!exists(pkgJsonPath) || !exists(tsconfigPath)) continue;

    const pkgJson = readJson(pkgJsonPath);
    const tsconfig = readJson(tsconfigPath);

    // Only touch composite projects (your intended target set)
    if (!tsconfig?.compilerOptions?.composite) continue;

    const wsDepNames = getWorkspaceDeps(pkgJson);

    const refDirs = wsDepNames
      .map((depName) => {
        const depDir = nameToDir.get(depName);
        if (!depDir) {
          warnings.push(
            `[WARN] ${pkgJson.name}: dependency ${depName} is workspace:* but no packages/<dir>/package.json named ${depName} was found`
          );
          return null;
        }
        return depDir;
      })
      .filter(Boolean);

    // Convert to tsconfig references: "../<depDir>"
    const refs = refDirs.map((depDir) => `../${depDir}`).sort((a, b) => a.localeCompare(b));

    const before = JSON.stringify(tsconfig.references ?? []);
    normalizeReferences(tsconfig, refs);
    const after = JSON.stringify(tsconfig.references);

    if (before !== after) {
      writeJsonPretty(tsconfigPath, tsconfig);
      changedCount++;
      console.log(`[UPDATED] packages/${dir}/tsconfig.json references (${refs.length})`);
    }
  }

  for (const w of warnings) console.warn(w);

  console.log(`\nDone. Updated ${changedCount} tsconfig.json file(s).`);
}

main();
