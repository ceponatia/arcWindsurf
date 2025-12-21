import type { Context } from 'hono';
import type { OwnerEmail } from '@minimal-rpg/db/node';
import { getAuthUser } from './middleware.js';

/**
 * Returns the canonical owner key for the current request.
 *
 * - When auth is enabled and a user is present, uses the user's email (preferred) or identifier.
 * - When auth is disabled, falls back to a stable local owner key.
 *
 * Note: sessions and session-linked data are private-only and must never use the literal
 * value "public" as an owner.
 */
export function getOwnerEmail(c: Context): OwnerEmail {
  const user = getAuthUser(c);

  const raw = user?.email ?? user?.identifier ?? null;
  if (raw) {
    return normalizeOwnerEmail(raw);
  }

  // Auth disabled or missing; treat the instance as single-tenant.
  return 'local';
}

/** Normalizes an owner identifier into the canonical OwnerEmail string form. */
export function normalizeOwnerEmail(value: string): OwnerEmail {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error('Owner email is required');
  }

  if (normalized === 'public') {
    throw new Error('Owner email must not be "public" for session-scoped data');
  }

  return normalized;
}
