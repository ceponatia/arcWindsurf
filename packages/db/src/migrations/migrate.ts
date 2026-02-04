import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveDatabaseUrl } from '../connection/resolve-database-url.js';
import { isSupabaseUrl } from '../utils/url-validator.js';
import type { FsPromisesLike, PathLike, SqlText } from '../types.js';
import type { MigrationPool } from './types.js';

function redactDbUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    // Fallback: redact anything between first ':' and '@' for URLs like protocol://user:pass@host
    return url.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:***@');
  }
}

export async function runMigrations(): Promise<void> {
  // Load env vars for local/dev usage.
  // Source of truth: repo root `.env` (shared across the monorepo).
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

  // Create a plain pool without pgvector registration (since extension may not exist yet)
  const env: Record<string, string | undefined> =
    (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env ?? {};

  const resolvedDb = resolveDatabaseUrl(env);
  const resolvedDbUrl = resolvedDb.url;
  const isSupabase = isSupabaseUrl(resolvedDbUrl);

  const pool = new Pool({
    connectionString: resolvedDbUrl,
    // Avoid hanging forever on bad networking/DNS.
    connectionTimeoutMillis: 15_000,
    // Supabase requires SSL; node-postgres does not reliably infer this from `sslmode=require`.
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  }) as unknown as MigrationPool;

  const Path = path as unknown as PathLike;
  const FS = fs as unknown as FsPromisesLike;

  // Support SQL_DIR env var for fresh migrations (sql-fresh vs sql)
  const sqlDirName = env['SQL_DIR'] ?? 'sql';
  const sqlDir = Path.resolve(
    Path.dirname(new URL(import.meta.url).pathname),
    `../../${sqlDirName}`
  );
  try {
    await FS.mkdir(sqlDir, { recursive: true });
  } catch {
    // Directory may already exist; ignore
  }

  console.info(`[db] Using SQL directory: ${sqlDirName}`);

  // Only apply real, ordered migrations (e.g. 001_init.sql).
  // Ignore generated helpers like supabase_bootstrap.sql.
  async function getSqlFiles(dir: string): Promise<string[]> {
    const entries = await FS.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const res = Path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
          return getSqlFiles(res);
        } else {
          return res;
        }
      })
    );
    return files.flat();
  }

  const allFiles = await getSqlFiles(sqlDir);
  const files: string[] = allFiles
    .filter((f: string) => /^\d+_.+\.sql$/i.test(Path.basename(f)))
    .sort((a, b) => {
      // Sort primarily by filename to preserve numbering order across folders
      const nameA = Path.basename(a);
      const nameB = Path.basename(b);
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

  console.info(
    `[db] Running migrations against ${redactDbUrl(resolvedDbUrl)} (source=${resolvedDb.source})`
  );

  // Ensure required extensions FIRST (before any migrations rely on them)
  // - vector: embeddings
  // - pgcrypto: gen_random_uuid()
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: unknown }).code)
        : undefined;

    const isConnectivityError =
      code === 'ENETUNREACH' ||
      code === 'EAI_AGAIN' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      message.toLowerCase().includes('connection timeout') ||
      message.toLowerCase().includes('terminated unexpectedly');

    if (isConnectivityError) {
      console.error('[db] Failed to connect to Postgres:', message);
      console.error('[db] Common fixes:');
      console.error(
        "[db] - If your network has no IPv6 route (common), force IPv4: NODE_OPTIONS='--dns-result-order=ipv4first'"
      );
      console.error(
        '[db] - If your network blocks outbound Postgres (common on some WiFi/ISP), use a different network or VPN'
      );
      console.error(
        '[db] - Prefer Supabase Session/Transaction Pooler connection strings for IPv4-only networks'
      );
      console.error('[db] - Verify the host/port and that SSL is required (Supabase uses SSL)');
      throw err;
    }

    console.error('[db] Failed to create required extensions:', message);
    console.error(
      '[db] If you are using Supabase, enable extensions in the Supabase dashboard (Database -> Extensions) and retry.'
    );
    throw err;
  }

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
  const appliedSet = new Set((applied.rows as { name: string }[]).map((r) => r.name));

  for (const f of files) {
    const relativeName = Path.relative(sqlDir, f);
    if (appliedSet.has(relativeName)) {
      console.info(`[db] Skipping ${relativeName} (already applied)`);
      continue;
    }

    const sql: SqlText = await FS.readFile(f, 'utf8');
    console.info(`[db] Applying ${relativeName}...`);
    await pool.query(sql);

    // Record this migration as applied
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [relativeName]);
  }

  console.info('[db] Migrations complete.');
  await pool.end();
}

function isMainModule(): boolean {
  const argvPath = globalThis.process?.argv?.[1] ?? null;
  if (!argvPath) return false;
  try {
    return pathToFileURL(argvPath).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  runMigrations().catch((err: unknown) => {
    const isError = err instanceof Error;
    const message = isError ? err.message : String(err);
    console.error('[db] Migration failed:', message);
    throw isError ? err : new Error(message);
  });
}
