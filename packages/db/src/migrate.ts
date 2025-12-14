import { Pool } from 'pg';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import type { FsPromisesLike, PathLike, SqlFile, SqlText } from './types.js';

// Create a plain pool without pgvector registration (since extension may not exist yet)
const env: Record<string, string | undefined> =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env ?? {};
const resolvedDbUrl = env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:5432/minirpg';

interface MigrationPool {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  end: () => Promise<void>;
}

const pool = new Pool({ connectionString: resolvedDbUrl }) as unknown as MigrationPool;

async function run() {
  const Path = path as unknown as PathLike;
  const FS = fs as unknown as FsPromisesLike;

  const sqlDir = Path.resolve(Path.dirname(new URL(import.meta.url).pathname), '../sql');
  try {
    await FS.mkdir(sqlDir, { recursive: true });
  } catch {
    // Directory may already exist; ignore
  }

  const files: SqlFile[] = (await FS.readdir(sqlDir))
    .filter((f: string) => /\.sql$/i.test(f))
    .sort();

  console.log(`[db] Running migrations against ${resolvedDbUrl}`);

  // Ensure pgvector extension FIRST (before any code tries to use vector types)
  await pool.query('CREATE EXTENSION IF NOT EXISTS vector');

  // Create migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Get already applied migrations
  const applied = await pool.query('SELECT name FROM _migrations');
  const appliedSet = new Set((applied.rows as Array<{ name: string }>).map((r) => r.name));

  for (const f of files) {
    if (appliedSet.has(f)) {
      console.log(`[db] Skipping ${f} (already applied)`);
      continue;
    }

    const p = Path.join(sqlDir, f);
    const sql: SqlText = await FS.readFile(p, 'utf8');
    console.log(`[db] Applying ${f}...`);
    await pool.query(sql);

    // Record this migration as applied
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [f]);
  }

  console.log('[db] Migrations complete.');
  await pool.end();
}

run().catch((err: unknown) => {
  const isError = err instanceof Error;
  const message = isError ? err.message : String(err);
  console.error('[db] Migration failed:', message);
  // Re-throw to ensure non-zero exit without relying on global process typings
  throw isError ? err : new Error(message);
});
