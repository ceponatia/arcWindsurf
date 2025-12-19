import type { Context } from 'hono';
import {
  attachAuthUser,
  getAuthUser,
  requireAdmin,
  requireAuthIfEnabled,
} from '../../src/auth/middleware.js';
import type { AuthUser } from '../../src/auth/types.js';

vi.mock('../../src/auth/supabase.js', () => {
  return {
    getSupabaseAuthConfig: vi.fn(),
    verifySupabaseJwt: vi.fn(),
  };
});

vi.mock('../../src/auth/token.js', () => {
  return {
    getAuthSecret: vi.fn(),
    verifyAuthToken: vi.fn(),
  };
});

import { getSupabaseAuthConfig, verifySupabaseJwt } from '../../src/auth/supabase.js';
import { getAuthSecret, verifyAuthToken } from '../../src/auth/token.js';

const originalEnv = { ...process.env };

interface MockContextOptions {
  headers?: Record<string, string>;
  path?: string;
  method?: string;
}

interface MockContext {
  ctx: Context;
  setUser: (user: AuthUser) => void;
  getUser: () => AuthUser | undefined;
  getStatus: () => number | undefined;
  getJson: () => unknown;
}

function createMockContext(options: MockContextOptions = {}): MockContext {
  const { headers = {}, path = '/private', method = 'GET' } = options;
  const store = new Map<string, unknown>();
  let statusCode: number | undefined;
  let jsonBody: unknown;
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );

  const ctx = {
    req: {
      header: (name: string) => normalizedHeaders[name.toLowerCase()] ?? null,
      path,
      method,
    },
    get: (key: string) => store.get(key as never),
    set: (key: string, value: unknown) => store.set(key as never, value),
    status: (code: number) => {
      statusCode = code;
    },
    json: (body: unknown) => {
      jsonBody = body;
      return body;
    },
  } as unknown as Context;

  return {
    ctx,
    setUser: (user: AuthUser) => {
      store.set('authUser' as never, user);
    },
    getUser: () => store.get('authUser' as never) as AuthUser | undefined,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('getAuthUser', () => {
  it('returns the stored auth user when present', () => {
    const { ctx, setUser } = createMockContext();
    const user: AuthUser = { identifier: 'user-1', role: 'user', email: 'user@example.com' };
    setUser(user);

    expect(getAuthUser(ctx)).toEqual(user);
  });

  it('returns null when no auth user is stored', () => {
    const { ctx } = createMockContext();

    expect(getAuthUser(ctx)).toBeNull();
  });
});

describe('attachAuthUser', () => {
  const mockedGetSupabaseAuthConfig = vi.mocked(getSupabaseAuthConfig);
  const mockedVerifySupabaseJwt = vi.mocked(verifySupabaseJwt);
  const mockedGetAuthSecret = vi.mocked(getAuthSecret);
  const mockedVerifyAuthToken = vi.mocked(verifyAuthToken);

  const next = vi.fn().mockResolvedValue(undefined);

  const cases = [
    {
      name: 'uses Supabase verification when configured and grants admin role for listed email',
      header: 'Bearer supabase-token',
      supabaseConfig: { jwksUrl: 'https://example.com/jwks', issuer: 'supabase' },
      supabaseResult: { ok: true as const, claims: { sub: 'sub-123', email: 'admin@example.com' } },
      adminEmails: 'admin@example.com',
      expectedUser: { identifier: 'admin@example.com', role: 'admin', email: 'admin@example.com' },
      expectVerifyAuthTokenCalls: 0,
    },
    {
      name: 'falls back to local token verification when Supabase is not configured',
      header: 'Bearer local-token',
      supabaseConfig: null,
      supabaseResult: null,
      adminEmails: '',
      legacySecret: 'legacy-secret',
      legacyResult: {
        ok: true as const,
        payload: {
          sub: 'legacy-user',
          role: 'user' as const,
          iat: 1,
          exp: Math.floor(Date.now() / 1000) + 60,
        },
      },
      expectedUser: { identifier: 'legacy-user', role: 'user', email: null },
      expectVerifyAuthTokenCalls: 1,
    },
    {
      name: 'does nothing when Authorization header is missing',
      header: undefined,
      supabaseConfig: null,
      supabaseResult: null,
      adminEmails: '',
      legacySecret: 'legacy-secret',
      legacyResult: { ok: false as const, error: 'invalid' as const },
      expectedUser: null,
      expectVerifyAuthTokenCalls: 0,
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, async () => {
      const { ctx, getUser } = createMockContext({
        headers: testCase.header ? { Authorization: testCase.header } : {},
      });

      mockedGetSupabaseAuthConfig.mockReturnValue(testCase.supabaseConfig);
      mockedVerifySupabaseJwt.mockResolvedValue(testCase.supabaseResult as never);
      mockedGetAuthSecret.mockReturnValue(testCase.legacySecret ?? '');
      mockedVerifyAuthToken.mockReturnValue(testCase.legacyResult as never);

      process.env['ADMIN_EMAILS'] = testCase.adminEmails;

      await attachAuthUser(ctx, next);

      const user = getUser();
      if (testCase.expectedUser) {
        expect(user).toEqual(testCase.expectedUser);
      } else {
        expect(user).toBeUndefined();
      }

      expect(mockedVerifyAuthToken).toHaveBeenCalledTimes(testCase.expectVerifyAuthTokenCalls);
      expect(next).toHaveBeenCalledTimes(1);
    });
  }
});

describe('requireAuthIfEnabled', () => {
  const next = vi.fn().mockResolvedValue(undefined);

  const cases = [
    {
      name: 'passes through when AUTH_REQUIRED is not true',
      env: { AUTH_REQUIRED: 'false' },
      path: '/private',
      method: 'GET',
      user: undefined,
      expectedStatus: undefined,
      expectedError: undefined,
      expectNextCalls: 1,
    },
    {
      name: 'allows OPTIONS requests even when auth is required',
      env: { AUTH_REQUIRED: 'true' },
      path: '/private',
      method: 'OPTIONS',
      user: undefined,
      expectedStatus: undefined,
      expectedError: undefined,
      expectNextCalls: 1,
    },
    {
      name: 'allows public paths without auth when required',
      env: { AUTH_REQUIRED: 'true' },
      path: '/health',
      method: 'GET',
      user: undefined,
      expectedStatus: undefined,
      expectedError: undefined,
      expectNextCalls: 1,
    },
    {
      name: 'rejects missing auth on protected paths',
      env: { AUTH_REQUIRED: 'true' },
      path: '/private',
      method: 'GET',
      user: undefined,
      expectedStatus: 401,
      expectedError: { ok: false, error: 'Unauthorized' },
      expectNextCalls: 0,
    },
    {
      name: 'rejects non-invited users when invite-only',
      env: { AUTH_REQUIRED: 'true', INVITE_ONLY: 'true', INVITE_EMAILS: 'invited@example.com' },
      path: '/private',
      method: 'GET',
      user: { identifier: 'user-1', role: 'user', email: 'other@example.com' } satisfies AuthUser,
      expectedStatus: 403,
      expectedError: { ok: false, error: 'Forbidden' },
      expectNextCalls: 0,
    },
    {
      name: 'allows invited users when invite-only',
      env: { AUTH_REQUIRED: 'true', INVITE_ONLY: 'true', INVITE_EMAILS: 'allowed@example.com' },
      path: '/private',
      method: 'GET',
      user: { identifier: 'user-2', role: 'user', email: 'allowed@example.com' } satisfies AuthUser,
      expectedStatus: undefined,
      expectedError: undefined,
      expectNextCalls: 1,
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, async () => {
      process.env = { ...originalEnv, ...testCase.env };
      const { ctx, setUser, getStatus, getJson } = createMockContext({
        path: testCase.path,
        method: testCase.method,
      });
      next.mockClear();

      if (testCase.user) {
        setUser(testCase.user);
      }

      await requireAuthIfEnabled(ctx, next);

      expect(next).toHaveBeenCalledTimes(testCase.expectNextCalls);
      expect(getStatus()).toBe(testCase.expectedStatus);
      if (testCase.expectedError) {
        expect(getJson()).toEqual(testCase.expectedError);
      }
    });
  }
});

describe('requireAdmin', () => {
  const next = vi.fn().mockResolvedValue(undefined);

  const cases = [
    {
      name: 'allows admin users',
      user: { identifier: 'admin-1', role: 'admin', email: null } satisfies AuthUser,
      expectedStatus: undefined,
      expectedError: undefined,
      expectNextCalls: 1,
    },
    {
      name: 'rejects non-admin users',
      user: { identifier: 'user-3', role: 'user', email: 'user@example.com' } satisfies AuthUser,
      expectedStatus: 403,
      expectedError: { ok: false, error: 'Forbidden' },
      expectNextCalls: 0,
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, async () => {
      const { ctx, setUser, getStatus, getJson } = createMockContext();
      next.mockClear();

      if (testCase.user) {
        setUser(testCase.user);
      }

      await requireAdmin(ctx, next);

      expect(next).toHaveBeenCalledTimes(testCase.expectNextCalls);
      expect(getStatus()).toBe(testCase.expectedStatus);
      if (testCase.expectedError) {
        expect(getJson()).toEqual(testCase.expectedError);
      }
    });
  }
});
