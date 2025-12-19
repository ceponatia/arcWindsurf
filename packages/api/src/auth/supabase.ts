import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface SupabaseJwtClaims {
  sub: string;
  email: string | null;
}

export interface SupabaseAuthConfig {
  jwksUrl: string;
  issuer: string;
  audience?: string | undefined;
}

function readStringEnv(name: string): string | null {
  const v = process.env[name];
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
  const issuer = readStringEnv('SUPABASE_JWT_ISSUER');
  if (!issuer) return null;

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

  return { jwksUrl, issuer, audience };
}

function readEmailFromPayload(payload: JWTPayload): string | null {
  const email = payload['email'];
  return typeof email === 'string' && email.trim().length > 0 ? email.trim() : null;
}

/**
 * Verifies a Supabase access token (JWT) using remote JWKS.
 */
export async function verifySupabaseJwt(
  token: string,
  cfg: SupabaseAuthConfig
): Promise<{ ok: true; claims: SupabaseJwtClaims } | { ok: false; error: 'invalid' | 'expired' }> {
  try {
    const jwks = createRemoteJWKSet(new URL(cfg.jwksUrl));

    const { payload } = await jwtVerify(token, jwks, {
      issuer: cfg.issuer,
      ...(cfg.audience ? { audience: cfg.audience } : {}),
    });

    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    if (!sub) return { ok: false, error: 'invalid' };

    return {
      ok: true,
      claims: {
        sub,
        email: readEmailFromPayload(payload),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('exp') || msg.toLowerCase().includes('expired')) {
      return { ok: false, error: 'expired' };
    }
    return { ok: false, error: 'invalid' };
  }
}
