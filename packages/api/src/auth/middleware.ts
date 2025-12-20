import type { Context, Next } from 'hono';
import type { ApiError } from '../types.js';
import type { AuthUser } from './types.js';
import { getAuthSecret, verifyAuthToken } from './token.js';
import { getSupabaseAuthConfig, verifySupabaseJwt } from './supabase.js';

const AUTH_CONTEXT_KEY = 'authUser';

function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice('bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function getAuthUser(c: Context): AuthUser | null {
  const existing = c.get(AUTH_CONTEXT_KEY as never) as AuthUser | undefined;
  return existing ?? null;
}

export async function attachAuthUser(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header('Authorization') ?? null;
  const token = parseBearerToken(authHeader);

  const debugAuth = process.env['DEBUG_AUTH'] === 'true';

  if (debugAuth) {
    console.info('[auth] attachAuthUser', {
      method: c.req.method,
      path: c.req.path,
      hasAuthorizationHeader: Boolean(authHeader),
      hasBearerToken: Boolean(token),
    });
  }

  if (token) {
    // Prefer Supabase JWT verification if configured.
    const supabaseCfg = getSupabaseAuthConfig();
    if (supabaseCfg) {
      if (debugAuth) {
        console.info('[auth] Supabase auth configured', {
          jwksUrl: supabaseCfg.jwksUrl,
          issuers: supabaseCfg.issuers,
          audience: supabaseCfg.audience ?? null,
        });
      }

      const verified = await verifySupabaseJwt(token, supabaseCfg);
      if (verified.ok) {
        const email = verified.claims.email;

        const adminEmails = new Set(
          (process.env['ADMIN_EMAILS'] ?? '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        );

        const role = email && adminEmails.has(email.toLowerCase()) ? 'admin' : 'user';

        c.set(AUTH_CONTEXT_KEY as never, {
          identifier: email ?? verified.claims.sub,
          role,
          email,
        } satisfies AuthUser);
        if (debugAuth) {
          console.info('[auth] Supabase JWT verified', {
            identifier: email ?? verified.claims.sub,
            hasEmail: Boolean(email),
            role,
          });
        }
      } else if (process.env['DEBUG_AUTH'] === 'true') {
        console.warn('[auth] Supabase JWT verification failed', {
          error: verified.error,
          debugMessage: verified.debugMessage,
          jwksUrl: supabaseCfg.jwksUrl,
          issuers: supabaseCfg.issuers,
          audience: supabaseCfg.audience ?? null,
        });
      }
    } else if (debugAuth) {
      console.warn('[auth] Supabase auth NOT configured (SUPABASE_JWT_ISSUER or JWKS missing)');
    } else {
      // Legacy local auth token verification.
      const secret = getAuthSecret();
      if (secret) {
        const verified = verifyAuthToken(token, secret);
        if (verified.ok) {
          c.set(AUTH_CONTEXT_KEY as never, {
            identifier: verified.payload.sub,
            role: verified.payload.role,
            email: null,
          } satisfies AuthUser);
          if (debugAuth) {
            console.info('[auth] Local auth token verified', {
              identifier: verified.payload.sub,
              role: verified.payload.role,
            });
          }
        }
      } else if (debugAuth) {
        console.warn('[auth] Local auth secret missing (AUTH_SECRET)');
      }
    }
  }

  await next();
}

function isAuthRequired(): boolean {
  return process.env['AUTH_REQUIRED'] === 'true';
}

function isInviteOnly(): boolean {
  return process.env['INVITE_ONLY'] === 'true';
}

function getInviteEmails(): Set<string> {
  return new Set(
    (process.env['INVITE_EMAILS'] ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isPublicPath(path: string): boolean {
  if (path === '/' || path === '') return true;
  if (path === '/health' || path === '/hello' || path === '/config') return true;
  if (path.startsWith('/auth/')) return true;
  return false;
}

/**
 * Enforces auth for all non-public routes when AUTH_REQUIRED=true.
 *
 * Also optionally enforces invite-only access when INVITE_ONLY=true.
 */
export async function requireAuthIfEnabled(c: Context, next: Next): Promise<void> {
  if (!isAuthRequired()) {
    await next();
    return;
  }

  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  const path = c.req.path;
  if (isPublicPath(path)) {
    await next();
    return;
  }

  const user = getAuthUser(c);
  if (!user) {
    c.status(401);
    c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError);
    return;
  }

  if (isInviteOnly()) {
    const invited = getInviteEmails();
    const email = user.email ?? null;
    if (!email || !invited.has(email.toLowerCase())) {
      c.status(403);
      c.json({ ok: false, error: 'Forbidden' } satisfies ApiError);
      return;
    }
  }

  await next();
}

export async function requireAdmin(c: Context, next: Next): Promise<void> {
  const user = getAuthUser(c);

  if (!user) {
    c.status(401);
    c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError);
    return;
  }

  if (user.role !== 'admin') {
    c.status(403);
    c.json({ ok: false, error: 'Forbidden' } satisfies ApiError);
    return;
  }

  await next();
}
