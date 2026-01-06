import { drizzle as createDrizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../schema/index.js';
import { resolveDatabaseUrl } from './resolve-database-url.js';

const { Pool } = pg;

const { url } = resolveDatabaseUrl(process.env);

export const pool = new Pool({
  connectionString: url,
});

export const drizzle = createDrizzle(pool, { schema });
