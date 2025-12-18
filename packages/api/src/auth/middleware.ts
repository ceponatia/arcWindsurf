import type { Context, Next } from 'hono';
import type { ApiError } from '../types.js';
import type { AuthUser } from './types.js';
import { getAuthSecret, verifyAuthToken } from './token.js';

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

  if (token) {
    const secret = getAuthSecret();
    if (secret) {
      const verified = verifyAuthToken(token, secret);
      if (verified.ok) {
        c.set(AUTH_CONTEXT_KEY as never, {
          identifier: verified.payload.sub,
          role: verified.payload.role,
        } satisfies AuthUser);
      }
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
