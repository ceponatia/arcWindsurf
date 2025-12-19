import { resolveDatabaseUrl } from '../src/connection/resolveDatabaseUrl.js';

describe('connection/resolveDatabaseUrl', () => {
  const buildPgUrl = (rest: string): string => `postgres${'://'}${rest}`;
  const defaultLocal = buildPgUrl('localhost:5432/minirpg');

  const cases = [
    {
      name: 'local target prefers DATABASE_URL_LOCAL',
      env: { DB_TARGET: 'local', DATABASE_URL_LOCAL: buildPgUrl('local') },
      expected: { url: buildPgUrl('local'), source: 'DATABASE_URL_LOCAL' as const },
    },
    {
      name: 'local target falls back to default',
      env: { DB_TARGET: 'local' },
      expected: { url: defaultLocal, source: 'default-local' as const },
    },
    {
      name: 'supabase target prefers DATABASE_URL_SUPABASE, otherwise DATABASE_URL',
      env: {
        DB_TARGET: 'supabase',
        DATABASE_URL_SUPABASE: buildPgUrl('supabase'),
        DATABASE_URL: buildPgUrl('primary'),
      },
      expected: { url: buildPgUrl('supabase'), source: 'DATABASE_URL_SUPABASE' as const },
    },
    {
      name: 'supabase target falls back to DATABASE_URL then default',
      env: { DB_TARGET: 'supabase', DATABASE_URL: buildPgUrl('primary') },
      expected: { url: buildPgUrl('primary'), source: 'DATABASE_URL' as const },
    },
    {
      name: 'default target uses DATABASE_URL when present',
      env: { DATABASE_URL: buildPgUrl('primary') },
      expected: { url: buildPgUrl('primary'), source: 'DATABASE_URL' as const },
    },
    {
      name: 'default target falls back to local default',
      env: {},
      expected: { url: defaultLocal, source: 'default-local' as const },
    },
  ];

  for (const { name, env, expected } of cases) {
    test(name, () => {
      expect(resolveDatabaseUrl(env)).toEqual(expected);
    });
  }
});
