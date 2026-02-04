import type { Hono } from 'hono';
import { z } from 'zod';
import { verifyLocalUserPassword, getOrCreateDefaultUser } from '@minimal-rpg/db/node';
import type { ApiError } from '../../types.js';
import type { AuthTokenPayload, AuthUser } from '../../auth/types.js';
import { getAuthSecret, signAuthToken } from '../../auth/token.js';
import { getAuthUser } from '../../auth/middleware.js';
import { loginRateLimiter } from '../../middleware/rate-limiter.js';
import { validateBody } from '../../utils/request-validation.js';
import { getEnvCsv, getEnvFlag } from '../../utils/env.js';

const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

function makeTokenPayload(user: AuthUser, ttlSeconds: number): AuthTokenPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: user.identifier,
    role: user.role,
    iat: now,
    exp: now + ttlSeconds,
  };
}

export function registerAuthRoutes(app: Hono): void {
  app.post('/auth/login', loginRateLimiter, async (c) => {
    const parsed = await validateBody(c, LoginSchema);
    if (!parsed.success) return parsed.errorResponse;

    // Ensure the legacy default user row exists; does not authenticate.
    await getOrCreateDefaultUser();

    const result = await verifyLocalUserPassword({
      identifier: parsed.data.identifier,
      password: parsed.data.password,
    });

    if (!result.ok) {
      return c.json({ ok: false, error: 'invalid credentials' } satisfies ApiError, 401);
    }

    const secret = getAuthSecret();
    if (!secret) {
      return c.json({ ok: false, error: 'AUTH_SECRET is required' } satisfies ApiError, 500);
    }

    const user: AuthUser = { identifier: result.user.identifier, role: result.user.role };
    const payload = makeTokenPayload(user, 60 * 60 * 12); // 12h
    const token = signAuthToken(payload, secret);

    return c.json(
      {
        ok: true,
        token,
        user,
      },
      200
    );
  });

  app.get('/auth/me', (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: true, user: null }, 200);
    }

    if (getEnvFlag('INVITE_ONLY')) {
      const invited = new Set(getEnvCsv('INVITE_EMAILS').map((email) => email.toLowerCase()));
      const email = user.email ?? null;
      if (!email || !invited.has(email.toLowerCase())) {
        return c.json({ ok: false, error: 'Forbidden' } satisfies ApiError, 403);
      }
    }

    return c.json({ ok: true, user }, 200);
  });
}
