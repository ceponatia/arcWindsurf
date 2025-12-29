import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabaseUrl } from './connection/resolveDatabaseUrl.js';
import type { FsPromisesLike, PathLike, SqlFile, SqlText } from './types.js';

// Load env vars for local/dev usage.
// Source of truth: repo root `.env` (shared across the monorepo).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Create a plain pool without pgvector registration (since extension may not exist yet)
const env: Record<string, string | undefined> =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env ?? {};
const resolvedDb = resolveDatabaseUrl(env);
const resolvedDbUrl = resolvedDb.url;

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

const isSupabase =
  resolvedDbUrl.includes('supabase.co') ||
  resolvedDbUrl.includes('supabase.com') ||
  resolvedDbUrl.includes('pooler.supabase.com');

interface MigrationPool {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  end: () => Promise<void>;
}

const pool = new Pool({
  connectionString: resolvedDbUrl,
  // Avoid hanging forever on bad networking/DNS.
  connectionTimeoutMillis: 15_000,
  // Supabase requires SSL; node-postgres does not reliably infer this from `sslmode=require`.
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
}) as unknown as MigrationPool;

async function run() {
  const Path = path as unknown as PathLike;
  const FS = fs as unknown as FsPromisesLike;

  const sqlDir = Path.resolve(Path.dirname(new URL(import.meta.url).pathname), '../sql');
  try {
    await FS.mkdir(sqlDir, { recursive: true });
  } catch {
    // Directory may already exist; ignore
  }

  // Only apply real, ordered migrations (e.g. 001_init.sql).
  // Ignore generated helpers like supabase_bootstrap.sql.
  const files: SqlFile[] = (await FS.readdir(sqlDir))
    .filter((f: string) => /^\d+_.+\.sql$/i.test(f))
    .sort();

  console.log(
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
