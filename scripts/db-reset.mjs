#!/usr/bin/env node
// Reset the dev database: drop, re-create, apply migrations, seed.
// Safe for local development; destructive. Do not use against production DBs.

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const DEFAULT_DB_FILE = path.join(ROOT, 'packages/api/prisma/dev.db');
const DEFAULT_DB_URL = process.env.DATABASE_URL || pathToFileURL(DEFAULT_DB_FILE).href;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...opts.env } });
    child.on('exit', (code) => {
      if (code === 0) resolve(0);
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('[db-reset] Resetting dev database at', DEFAULT_DB_URL);
  await run('pnpm', ['-F', '@minimal-rpg/api', 'db:reset'], {
    env: { DATABASE_URL: DEFAULT_DB_URL },
  });
  console.log('[db-reset] Done.');
}

main().catch((err) => {
  console.error('[db-reset] Failed:', err.message || err);
  process.exit(1);
});
