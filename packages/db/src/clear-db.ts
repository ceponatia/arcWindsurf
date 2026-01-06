import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabaseUrl } from './connection/resolve-database-url.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const env: Record<string, string | undefined> =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env ?? {};
const resolvedDb = resolveDatabaseUrl(env);

const pool = new Pool({
  connectionString: resolvedDb.url,
  ssl: resolvedDb.url.includes('supabase.co') || resolvedDb.url.includes('supabase.com') ? { rejectUnauthorized: false } : undefined
});

async function clearDb() {
  console.log('[db] Clearing database...');
  try {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('[db] Database cleared.');
  } catch (err) {
    console.error('[db] Failed to clear database:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

clearDb().catch(() => process.exit(1));
