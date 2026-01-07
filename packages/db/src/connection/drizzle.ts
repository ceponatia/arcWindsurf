import { drizzle as createDrizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../schema/index.js';
import { pool } from '../utils/client.js';

export const drizzle = createDrizzle(pool, { schema });
