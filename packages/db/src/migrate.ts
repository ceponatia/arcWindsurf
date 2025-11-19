import { pool, resolvedDbUrl } from './prisma.js';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import type { FsPromisesLike, PathLike, PgPoolLike, SqlFile, SqlText } from './types.js';

async function run() {
  const Path = path as unknown as PathLike;
  const FS = fs as unknown as FsPromisesLike;
  const DB = pool as unknown as PgPoolLike;

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

  // Ensure pgvector extension
  await DB.query('CREATE EXTENSION IF NOT EXISTS vector');

  for (const f of files) {
    const p = Path.join(sqlDir, f);
    const sql: SqlText = await FS.readFile(p, 'utf8');
    console.log(`[db] Applying ${f}...`);
    await DB.query(sql);
  }

  console.log('[db] Migrations complete.');
  await DB.end();
}

run().catch((err: unknown) => {
  const isError = err instanceof Error;
  const message = isError ? err.message : String(err);
  console.error('[db] Migration failed:', message);
  // Re-throw to ensure non-zero exit without relying on global process typings
  throw isError ? err : new Error(message);
});
