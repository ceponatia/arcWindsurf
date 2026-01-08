import crypto from 'node:crypto';
import type { AuthTokenPayload } from './types.js';

function base64UrlEncode(input: Uint8Array): string {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function base64UrlEncodeJson(obj: unknown): string {
  const raw = Buffer.from(JSON.stringify(obj), 'utf8');
  return base64UrlEncode(raw);
}

function base64UrlDecodeToBuffer(s: string): Buffer {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function getAuthSecret(): string {
  const secret = process.env['AUTH_SECRET'];
  if (secret && secret.trim().length >= 16) return secret;

  // Dev fallback: tokens are only as strong as this secret.
  // If you want stable tokens across restarts, set AUTH_SECRET in your environment.
  return process.env['NODE_ENV'] === 'production' ? '' : 'dev-secret-change-me';
}

export function signAuthToken(payload: AuthTokenPayload, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerPart = base64UrlEncodeJson(header);
  const payloadPart = base64UrlEncodeJson(payload);
  const data = `${headerPart}.${payloadPart}`;

  // HMAC-SHA256 is used here for JWT signature (HS256 algorithm), NOT for password hashing.
  // This is the standard and correct approach for JWT token signing.
  // For password hashing, see packages/db/src/repositories/users.ts which uses scrypt.
  // lgtm[js/insufficient-password-hash]
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  const sigPart = base64UrlEncode(sig);
  return `${data}.${sigPart}`;
}

export function verifyAuthToken(
  token: string,
  secret: string
): { ok: true; payload: AuthTokenPayload } | { ok: false; error: 'invalid' | 'expired' } {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'invalid' };

  const headerPart = parts[0] ?? '';
  const payloadPart = parts[1] ?? '';
  const sigPart = parts[2] ?? '';

  if (!headerPart || !payloadPart || !sigPart) return { ok: false, error: 'invalid' };

  const data = `${headerPart}.${payloadPart}`;
  const expectedSig = base64UrlEncode(crypto.createHmac('sha256', secret).update(data).digest());

  if (!timingSafeEqualStr(expectedSig, sigPart)) return { ok: false, error: 'invalid' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecodeToBuffer(payloadPart).toString('utf8')) as unknown;
  } catch {
    return { ok: false, error: 'invalid' };
  }

  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'invalid' };

  const p = parsed as Record<string, unknown>;
  const sub = typeof p['sub'] === 'string' ? p['sub'] : null;
  const role = p['role'] === 'admin' ? 'admin' : p['role'] === 'user' ? 'user' : null;
  const iat = typeof p['iat'] === 'number' ? p['iat'] : null;
  const exp = typeof p['exp'] === 'number' ? p['exp'] : null;

  if (!sub || !role || !iat || !exp) return { ok: false, error: 'invalid' };

  const now = Math.floor(Date.now() / 1000);
  if (now >= exp) return { ok: false, error: 'expired' };

  return {
    ok: true,
    payload: {
      sub,
      role,
      iat,
      exp,
    },
  };
}
