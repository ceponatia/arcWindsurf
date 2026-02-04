import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { getEnvValue } from '../utils/env.js';

export interface SupabaseJwtClaims {
  sub: string;
  email: string | null;
}

export interface SupabaseAuthConfig {
  jwksUrl: string;
  issuers: string[];
  audience?: string | undefined;
  algorithms: string[];
}

const DEFAULT_SUPABASE_JWT_ALGORITHMS: string[] = [
  // Common asymmetric JWS algorithms. Intentionally excludes HS* to prevent
  // "public key as HMAC secret" style JWT algorithm confusion.
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
];

/**
 * Reads SUPABASE_JWT_ALGS as a comma-separated allowlist.
 *
 * If unspecified, defaults to a safe asymmetric-only allowlist.
 */
function readSupabaseJwtAlgorithmsFromEnv(): string[] {
  const raw = readStringEnv('SUPABASE_JWT_ALGS');
  if (!raw) return DEFAULT_SUPABASE_JWT_ALGORITHMS;

  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_SUPABASE_JWT_ALGORITHMS;
}

type SupabaseEnvVar =
  | 'SUPABASE_JWT_ISSUER'
  | 'SUPABASE_JWKS_URL'
  | 'SUPABASE_PROJECT_URL'
  | 'SUPABASE_JWT_AUDIENCE'
  | 'SUPABASE_JWT_ALGS';

/**
 * Reads a supported Supabase environment variable, trimmed.
 */
function readStringEnv(name: SupabaseEnvVar): string | null {
  const v = getEnvValue(name);

  if (!v) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Reads Supabase auth config from env.
 *
 * Supported env vars:
 * - SUPABASE_JWKS_URL (optional)
 * - SUPABASE_PROJECT_URL (optional)
 * - SUPABASE_JWT_ISSUER (required if Supabase auth enabled)
 * - SUPABASE_JWT_AUDIENCE (optional)
 */
export function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const issuerEnv = readStringEnv('SUPABASE_JWT_ISSUER');
  if (!issuerEnv) return null;

  const issuers = issuerEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (issuers.length === 0) return null;

  const jwksUrl =
    readStringEnv('SUPABASE_JWKS_URL') ??
    (() => {
      const projectUrl = readStringEnv('SUPABASE_PROJECT_URL');
      if (!projectUrl) return null;
      // Supabase GoTrue JWKS endpoint:
      // https://<ref>.supabase.co/auth/v1/.well-known/jwks.json
      return `${projectUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
    })();

  if (!jwksUrl) return null;

  const audience = readStringEnv('SUPABASE_JWT_AUDIENCE') ?? undefined;

  const algorithms = readSupabaseJwtAlgorithmsFromEnv();

  return { jwksUrl, issuers, audience, algorithms };
}

function readEmailFromPayload(payload: JWTPayload): string | null {
  const recordPayload = payload as Record<string, unknown>;
  const claim = typeof recordPayload['email'] === 'string' ? recordPayload['email'] : null;
  const email = claim?.trim().toLowerCase() ?? '';
  return email.length > 0 ? email : null;
}

/**
 * Verifies a Supabase access token (JWT) using remote JWKS.
 */
export async function verifySupabaseJwt(
  token: string,
  cfg: SupabaseAuthConfig
): Promise<
  | { ok: true; claims: SupabaseJwtClaims }
  | { ok: false; error: 'invalid' | 'expired'; debugMessage?: string }
> {
  try {
    const jwks = createRemoteJWKSet(new URL(cfg.jwksUrl));

    let lastError: unknown = undefined;
    let lastErrorMessage: string | undefined = undefined;
    let lastIssuer: string | undefined = undefined;
    for (const issuer of cfg.issuers) {
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer,
          ...(cfg.audience ? { audience: cfg.audience } : {}),
          algorithms: cfg.algorithms,
        });

        const sub = typeof payload.sub === 'string' ? payload.sub : null;
        if (!sub) return { ok: false, error: 'invalid', debugMessage: 'missing sub' };

        return {
          ok: true,
          claims: {
            sub,
            email: readEmailFromPayload(payload),
          },
        };
      } catch (err) {
        lastError = err;
        lastIssuer = issuer;
        if (err instanceof Error) {
          lastErrorMessage = err.message;
        } else if (typeof err === 'string') {
          lastErrorMessage = err;
        }
        continue;
      }
    }

    const issuerContext = lastIssuer ? `issuer=${lastIssuer}` : 'issuer=<none>';
    const audienceContext = cfg.audience ? `audience=${cfg.audience}` : 'audience=<none>';
    const contextInfo = `${issuerContext} ${audienceContext} jwksUrl=${cfg.jwksUrl}`;

    if (lastError instanceof Error) {
      throw new Error(`${contextInfo} err=${lastError.message}`);
    }
    throw new Error(`${contextInfo} err=${lastErrorMessage ?? 'JWT verification failed'}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('exp') || msg.toLowerCase().includes('expired')) {
      return { ok: false, error: 'expired', debugMessage: msg };
    }
    return { ok: false, error: 'invalid', debugMessage: msg };
  }
}
