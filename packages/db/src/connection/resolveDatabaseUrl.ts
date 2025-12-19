/**
 * Resolve the Postgres connection string to use for this process.
 *
 * This repo has two common targets:
 * - Local dev: a local Postgres (or Docker Compose Postgres)
 * - Staging: Supabase Postgres (via Fly secrets)
 *
 * Rules:
 * - If `DB_TARGET=local`, prefer `DATABASE_URL_LOCAL`, else fall back to a safe local default.
 * - If `DB_TARGET=supabase`, prefer `DATABASE_URL_SUPABASE`, else fall back to `DATABASE_URL`.
 * - Otherwise (default), use `DATABASE_URL` if set, else fall back to the local default.
 */
export function resolveDatabaseUrl(env: Record<string, string | undefined>): {
  url: string;
  source: 'DATABASE_URL' | 'DATABASE_URL_LOCAL' | 'DATABASE_URL_SUPABASE' | 'default-local';
} {
  const target = (env['DB_TARGET'] ?? '').trim().toLowerCase();

  const defaultLocal = 'postgres://postgres:postgres@localhost:5432/minirpg';

  if (target === 'local') {
    const url = env['DATABASE_URL_LOCAL'] ?? defaultLocal;
    return {
      url,
      source: env['DATABASE_URL_LOCAL'] ? 'DATABASE_URL_LOCAL' : 'default-local',
    };
  }

  if (target === 'supabase') {
    if (env['DATABASE_URL_SUPABASE']) {
      return { url: env['DATABASE_URL_SUPABASE'], source: 'DATABASE_URL_SUPABASE' };
    }
    if (env['DATABASE_URL']) {
      return { url: env['DATABASE_URL'], source: 'DATABASE_URL' };
    }
    return { url: defaultLocal, source: 'default-local' };
  }

  if (env['DATABASE_URL']) {
    return { url: env['DATABASE_URL'], source: 'DATABASE_URL' };
  }

  return { url: defaultLocal, source: 'default-local' };
}
