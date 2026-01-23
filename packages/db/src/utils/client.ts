import { Pool } from 'pg';
import { registerType } from '../vector/pgvector.js';
import { resolveDatabaseUrl } from '../connection/resolve-database-url.js';
import { isSupabaseUrl } from './url-validator.js';
import type { PgPoolStrict } from '../types.js';

const globalEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const env: Record<string, string | undefined> = globalEnv;

export const resolvedDbUrl = resolveDatabaseUrl(env).url;
export const resolvedDbPath = resolvedDbUrl;

function createPool(url: string): PgPoolStrict {
  const Ctor = Pool as unknown as new (config: {
    connectionString: string;
    ssl?: { rejectUnauthorized: boolean };
  }) => PgPoolStrict;

  const isSupabase = isSupabaseUrl(url);

  return new Ctor({
    connectionString: url,
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

// Create the pool and treat it as a strict Pg pool
const rawPool = createPool(resolvedDbUrl);

// Register pgvector types for each new client from the pool
// We cast to any here so we don't have to add `on` to PgPoolStrict
(rawPool as unknown as { on?: (event: string, listener: (client: unknown) => void) => void }).on?.(
  'connect',
  (client: unknown) => {
    (registerType as (client: unknown) => void)(client);
  }
);

export const pool: PgPoolStrict = rawPool;
