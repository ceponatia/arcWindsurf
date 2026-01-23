/**
 * Vitest global setup for @minimal-rpg/api.
 *
 * Some transitive imports pull in `@minimal-rpg/db/node`, which initializes a pg Pool
 * at module-load time and requires at least one database URL env var to be present.
 *
 * API unit tests should not require real DB connectivity, so we set a harmless
 * placeholder URL to keep module initialization deterministic.
 */

process.env['DATABASE_URL_LOCAL'] ??= 'postgres://user:pass@localhost:5432/test';
