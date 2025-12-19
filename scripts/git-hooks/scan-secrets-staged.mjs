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
 * Heuristic filter for “text-ish” files to scan.
 *
 * @param {string} filePath
 * @returns {boolean}
 */
function shouldScan(filePath) {
  // Skip binary-ish, vendored, and huge noise by extension.
  const lower = filePath.toLowerCase();
  if (lower.startsWith('node_modules/') || lower.includes('/node_modules/')) return false;
  if (lower.startsWith('dist/') || lower.includes('/dist/')) return false;
  if (lower.startsWith('.turbo/') || lower.includes('/.turbo/')) return false;

  // Common “committed but not useful to scan” formats.
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.gif')
  )
    return false;
  if (lower.endsWith('.webp') || lower.endsWith('.ico') || lower.endsWith('.pdf')) return false;
  if (lower.endsWith('.zip') || lower.endsWith('.gz') || lower.endsWith('.tgz')) return false;

  return true;
}

/**
 * Runs secretlint on staged files.
 *
 * @returns {void}
 */
function main() {
  const files = getStagedFiles().filter(shouldScan);
  if (files.length === 0) return;

  // secretlint exits non-zero on findings; let that fail the hook.
  execFileSync('pnpm', ['-w', 'exec', 'secretlint', ...files], {
    stdio: 'inherit',
  });
}

main();
