#!/usr/bin/env node
/**
 * Wrapper around the local Turbo binary that ensures Turbo can always locate
 * the workspace package manager when running tasks from package subdirectories.
 *
 * In some environments, `npm_execpath` is set to a relative path like
 * `node_modules/.bin/pnpm`, which breaks when Turbo runs tasks with a package
 * directory as the working directory.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @returns {boolean} */
function isWindows() {
  return process.platform === 'win32';
}

/**
 * @param {string} repoRoot
 * @param {string} binName
 * @returns {string}
 */
function localBin(repoRoot, binName) {
  const suffix = isWindows() ? '.cmd' : '';
  return path.join(repoRoot, 'node_modules', '.bin', `${binName}${suffix}`);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const turboPath = localBin(repoRoot, 'turbo');
const pnpmPath = localBin(repoRoot, 'pnpm');

const args = process.argv.slice(2);

const env = {
  ...process.env,
  // Ensure Turbo resolves pnpm using an absolute path.
  npm_execpath: pnpmPath,
  // Ensure PATH includes the directory containing the local pnpm binary.
  PATH: [path.dirname(pnpmPath), process.env.PATH ?? ''].filter(Boolean).join(path.delimiter),
};

const child = spawn(turboPath, args, {
  cwd: repoRoot,
  env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('[turbo wrapper] Failed to start turbo:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (typeof code === 'number') process.exit(code);
  if (signal) process.exit(1);
  process.exit(1);
});
