import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseAuthConfig } from '../../src/auth/supabase.js';

const joseMocks = vi.hoisted(() => ({
  createRemoteJWKSetMock: vi.fn(),
  jwtVerifyMock: vi.fn(),
}));

vi.mock('jose', () => ({
  createRemoteJWKSet: joseMocks.createRemoteJWKSetMock,
  jwtVerify: joseMocks.jwtVerifyMock,
}));

import { getSupabaseAuthConfig, verifySupabaseJwt } from '../../src/auth/supabase.js';

const originalEnv = process.env;

/**
 * Update process.env for test cases.
 */
function setEnv(next: Record<string, string | undefined>): void {
  process.env = { ...originalEnv, ...next };
}

describe('auth/supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null when issuer is missing', () => {
    setEnv({
      SUPABASE_JWT_ISSUER: undefined,
      SUPABASE_JWKS_URL: undefined,
      SUPABASE_PROJECT_URL: undefined,
    });

    expect(getSupabaseAuthConfig()).toBeNull();
  });

  it('builds config from project url when jwks url missing', () => {
    setEnv({
      SUPABASE_JWT_ISSUER: 'https://issuer',
      SUPABASE_PROJECT_URL: 'https://project.supabase.co/',
      SUPABASE_JWKS_URL: undefined,
      SUPABASE_JWT_AUDIENCE: 'aud',
    });

    expect(getSupabaseAuthConfig()).toEqual({
      jwksUrl: 'https://project.supabase.co/auth/v1/.well-known/jwks.json',
      issuers: ['https://issuer'],
      audience: 'aud',
      algorithms: expect.any(Array),
    });
  });

  it('reads algorithm allowlist from env', () => {
    setEnv({
      SUPABASE_JWT_ISSUER: 'issuer',
      SUPABASE_JWKS_URL: 'https://jwks',
      SUPABASE_JWT_ALGS: 'RS256,ES256',
    });

    const cfg = getSupabaseAuthConfig();
    expect(cfg?.algorithms).toEqual(['RS256', 'ES256']);
  });

  it('verifies JWTs against issuers until one succeeds', async () => {
    const cfg: SupabaseAuthConfig = {
      jwksUrl: 'https://jwks',
      issuers: ['issuer-a', 'issuer-b'],
      algorithms: ['RS256'],
    };

    joseMocks.createRemoteJWKSetMock.mockReturnValue('jwks');
    joseMocks.jwtVerifyMock
      .mockRejectedValueOnce(new Error('invalid issuer'))
      .mockResolvedValueOnce({
        payload: { sub: 'user-1', email: ' USER@EXAMPLE.COM ' },
      });

    const result = await verifySupabaseJwt('token', cfg);

    expect(result).toEqual({
      ok: true,
      claims: { sub: 'user-1', email: 'user@example.com' },
    });
  });

  it('returns invalid when sub is missing', async () => {
    const cfg: SupabaseAuthConfig = {
      jwksUrl: 'https://jwks',
      issuers: ['issuer-a'],
      algorithms: ['RS256'],
    };

    joseMocks.createRemoteJWKSetMock.mockReturnValue('jwks');
    joseMocks.jwtVerifyMock.mockResolvedValueOnce({ payload: { email: 'user@example.com' } });

    const result = await verifySupabaseJwt('token', cfg);

    expect(result).toEqual({ ok: false, error: 'invalid', debugMessage: 'missing sub' });
  });

  it('returns expired on exp-related errors', async () => {
    const cfg: SupabaseAuthConfig = {
      jwksUrl: 'https://jwks',
      issuers: ['issuer-a'],
      algorithms: ['RS256'],
    };

    joseMocks.createRemoteJWKSetMock.mockReturnValue('jwks');
    joseMocks.jwtVerifyMock.mockRejectedValueOnce(new Error('jwt expired'));

    const result = await verifySupabaseJwt('token', cfg);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('expired');
    }
  });

  it('returns invalid on non-expired errors', async () => {
    const cfg: SupabaseAuthConfig = {
      jwksUrl: 'https://jwks',
      issuers: ['issuer-a'],
      algorithms: ['RS256'],
    };

    joseMocks.createRemoteJWKSetMock.mockReturnValue('jwks');
    joseMocks.jwtVerifyMock.mockRejectedValueOnce(new Error('signature invalid'));

    const result = await verifySupabaseJwt('token', cfg);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('invalid');
    }
  });
});
