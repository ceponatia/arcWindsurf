/**
 * Vitest global setup for @minimal-rpg/api.
 *
 * Some transitive imports pull in `@minimal-rpg/db/node`, which initializes a pg Pool
 * at module-load time and requires at least one database URL env var to be present.
 *
 * API unit tests should not require real DB connectivity, so we set a harmless
 * placeholder URL to keep module initialization deterministic.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from workspace root for integration tests (quietly)
config({ path: resolve(process.cwd(), '../../.env'), quiet: true });

process.env['DATABASE_URL_LOCAL'] ??= 'postgres://user:pass@localhost:5432/test';
