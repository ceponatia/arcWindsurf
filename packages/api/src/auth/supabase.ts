import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface SupabaseJwtClaims {
  sub: string;
  email: string | null;
}

export interface SupabaseAuthConfig {
  jwksUrl: string;
  issuers: string[];
  audience?: string | undefined;
}

function readStringEnv(name: string): string | null {
  // eslint-disable-next-line security/detect-object-injection -- controlled lookup of environment variable
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

  return { jwksUrl, issuers, audience };
}

function readEmailFromPayload(payload: JWTPayload): string | null {
  const recordPayload = payload as Record<string, unknown>;
  const claim = typeof recordPayload['email'] === 'string' ? recordPayload['email'] : null;
  const email = claim?.trim() ?? '';
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

    const issuerInfo = lastIssuer ? `issuer=${lastIssuer}` : 'issuer=<none>';
    const audienceInfo = cfg.audience ? `audience=${cfg.audience}` : 'audience=<none>';
    const contextInfo = `${issuerInfo} ${audienceInfo} jwksUrl=${cfg.jwksUrl}`;

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
