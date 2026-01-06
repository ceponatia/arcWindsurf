import { describe, test, expect } from 'vitest';
import { resolveDatabaseUrl } from '../src/connection/resolve-database-url.js';

describe('connection/resolveDatabaseUrl', () => {
  const buildPgUrl = (rest: string): string => `postgres${'://'}${rest}`;

  const cases = [
    {
      name: 'local target prefers DATABASE_URL_LOCAL',
      env: { DB_TARGET: 'local', DATABASE_URL_LOCAL: buildPgUrl('local') },
      expected: { url: buildPgUrl('local'), source: 'DATABASE_URL_LOCAL' as const },
    },
    {
      name: 'local target throws if DATABASE_URL_LOCAL missing',
      env: { DB_TARGET: 'local' },
      error: 'DB_TARGET=local but DATABASE_URL_LOCAL is not defined',
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
      name: 'supabase target falls back to DATABASE_URL',
      env: { DB_TARGET: 'supabase', DATABASE_URL: buildPgUrl('primary') },
      expected: { url: buildPgUrl('primary'), source: 'DATABASE_URL' as const },
    },
    {
      name: 'supabase target falls back to DATABASE_URL_LOCAL if others missing',
      env: { DB_TARGET: 'supabase', DATABASE_URL_LOCAL: buildPgUrl('local') },
      expected: { url: buildPgUrl('local'), source: 'DATABASE_URL_LOCAL' as const },
    },
    {
      name: 'supabase target throws if all missing',
      env: { DB_TARGET: 'supabase' },
      error:
        'DB_TARGET=supabase but no valid database URL found (checked DATABASE_URL_SUPABASE, DATABASE_URL, DATABASE_URL_LOCAL)',
    },
    {
      name: 'default target uses DATABASE_URL when present',
      env: { DATABASE_URL: buildPgUrl('primary') },
      expected: { url: buildPgUrl('primary'), source: 'DATABASE_URL' as const },
    },
    {
      name: 'default target falls back to DATABASE_URL_LOCAL',
      env: { DATABASE_URL_LOCAL: buildPgUrl('local') },
      expected: { url: buildPgUrl('local'), source: 'DATABASE_URL_LOCAL' as const },
    },
    {
      name: 'default target throws if all missing',
      env: {},
      error: 'No database URL found (checked DATABASE_URL, DATABASE_URL_LOCAL)',
    },
  ];

  for (const { name, env, expected, error } of cases) {
    test(name, () => {
      if (error) {
        expect(() => resolveDatabaseUrl(env)).toThrow(error);
      } else {
        expect(resolveDatabaseUrl(env)).toEqual(expected);
      }
    });
  }
});
