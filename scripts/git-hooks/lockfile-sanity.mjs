import { execFileSync } from 'node:child_process';

/**
 * Return staged file paths (added/copied/modified/renamed) as repo-relative paths.
 *
 * @returns {string[]}
 */
function getStagedFiles() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    encoding: 'utf8',
  });

  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string[]} stagedFiles
 * @returns {void}
 */
function assertNoForbiddenLockfiles(stagedFiles) {
  const forbidden = stagedFiles.filter(
    (p) =>
      p === 'yarn.lock' ||
      p.endsWith('/yarn.lock') ||
      p === 'package-lock.json' ||
      p.endsWith('/package-lock.json') ||
      p === 'npm-shrinkwrap.json' ||
      p.endsWith('/npm-shrinkwrap.json')
  );

  if (forbidden.length === 0) return;

  throw new Error(
    `Forbidden lockfile(s) staged (use pnpm only):\n${forbidden.map((p) => `- ${p}`).join('\n')}`
  );
}

/**
 * Ensure pnpm-lock.yaml is staged when any package.json is staged.
 *
 * @param {string[]} stagedFiles
 * @returns {void}
 */
function assertPnpmLockUpdated(stagedFiles) {
  const packageJsonChanged = stagedFiles.some((p) => p.endsWith('package.json'));
  if (!packageJsonChanged) return;

  const pnpmLockStaged = stagedFiles.includes('pnpm-lock.yaml');
  if (pnpmLockStaged) return;

  throw new Error(
    'package.json is staged but pnpm-lock.yaml is not. Run `pnpm -w install` and stage pnpm-lock.yaml.'
  );
}

/**
 * @returns {void}
 */
function main() {
  const stagedFiles = getStagedFiles();

  assertNoForbiddenLockfiles(stagedFiles);
  assertPnpmLockUpdated(stagedFiles);
}

try {
  main();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  // Make it obvious in git output.
  process.stderr.write(`\n[pre-commit] Lockfile sanity failed:\n${msg}\n\n`);
  process.exit(1);
}
