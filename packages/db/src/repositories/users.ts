/**
 * User Account Database Functions
 *
 * Minimal implementation for storing user preferences.
 * Full authentication not implemented yet.
 */
import crypto from 'node:crypto';
import { pool } from '../utils/client.js';
import type { DbRow, UUID } from '../types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * User preferences stored in the database.
 */
export interface UserPreferences {
  /** Preferred workspace mode: wizard (step-by-step) or compact (power user) */
  workspaceMode?: 'wizard' | 'compact' | undefined;
  /** Future preferences can be added here */
  [key: string]: unknown;
}

export type UserRole = 'user' | 'admin';

export type AuthProvider = 'local' | 'supabase';

/**
 * User account record.
 */
export interface UserAccount {
  id: UUID;
  identifier: string;
  displayName: string | null;
  role: UserRole;
  authProvider: AuthProvider;
  supabaseUserId: UUID | null;
  preferences: UserPreferences;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Row type from the database.
 */
interface UserAccountRow extends DbRow {
  id: string;
  identifier: string;
  display_name: string | null;
  role?: string;
  auth_provider?: string;
  supabase_user_id?: string | null;
  preferences: unknown;
  password_hash?: string | null;
  last_login_at?: Date | string | null;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Helpers
// =============================================================================

function toIsoDate(v: unknown): string {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? new Date().toISOString() : v.toISOString();
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return new Date().toISOString();
}

function isUserPreferences(value: unknown): value is UserPreferences {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parsePreferences(raw: unknown): UserPreferences {
  if (isUserPreferences(raw)) {
    return raw;
  }

  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isUserPreferences(parsed)) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  return {};
}

function rowToUserAccount(row: UserAccountRow): UserAccount {
  const role = row.role === 'admin' ? 'admin' : 'user';
  const authProvider = row.auth_provider === 'supabase' ? 'supabase' : 'local';

  return {
    id: row.id,
    identifier: row.identifier,
    displayName: row.display_name,
    role,
    authProvider,
    supabaseUserId: row.supabase_user_id ?? null,
    preferences: parsePreferences(row.preferences),
    lastLoginAt: row.last_login_at ? toIsoDate(row.last_login_at) : null,
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
}

function readPasswordHash(row: UserAccountRow): string | null {
  const v = row.password_hash;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scryptKey(password, salt, 64, { N: 16384, r: 8, p: 1 });

  // Format: scrypt:N:r:p:saltB64:keyB64
  return `scrypt:16384:8:1:${salt.toString('base64')}:${key.toString('base64')}`;
}

async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const parts = passwordHash.split(':');
  if (parts.length !== 6) return false;
  const algo = parts[0];
  if (algo !== 'scrypt') return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltB64 = parts[4] ?? '';
  const keyB64 = parts[5] ?? '';

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  if (!saltB64 || !keyB64) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, 'base64');
    expected = Buffer.from(keyB64, 'base64');
  } catch {
    return false;
  }

  const actual = await scryptKey(password, salt, expected.length, { N: n, r, p });

  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function scryptKey(
  password: string,
  salt: Buffer,
  keyLen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLen, options, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}

// =============================================================================
// User Account Functions
// =============================================================================

/**
 * Get a user account by identifier.
 * Creates the default user if it doesn't exist.
 */
export async function getUserByIdentifier(identifier: string): Promise<UserAccount | null> {
  const res = await pool.query(`SELECT * FROM user_accounts WHERE identifier = $1 LIMIT 1`, [
    identifier,
  ]);

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0] as UserAccountRow;
  return rowToUserAccount(row);
}

export async function getUserRoleByIdentifier(identifier: string): Promise<UserRole | null> {
  const res = await pool.query(`SELECT role FROM user_accounts WHERE identifier = $1 LIMIT 1`, [
    identifier,
  ]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return row['role'] === 'admin' ? 'admin' : 'user';
}

/**
 * Get or create the default user account.
 * Used for single-user mode before authentication is implemented.
 */
export async function getOrCreateDefaultUser(): Promise<UserAccount> {
  const existing = await getUserByIdentifier('default');
  if (existing) {
    return existing;
  }

  // Create default user
  const res = await pool.query(
    `INSERT INTO user_accounts (identifier, display_name, preferences)
     VALUES ('default', 'Default User', '{"workspaceMode": "wizard"}'::jsonb)
     ON CONFLICT (identifier) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    []
  );

  const row = res.rows[0] as UserAccountRow;
  return rowToUserAccount(row);
}

export async function ensureUserRole(identifier: string, role: UserRole): Promise<void> {
  await pool.query(
    `INSERT INTO user_accounts (identifier, display_name, preferences, role, auth_provider)
     VALUES ($1, NULL, '{}'::jsonb, $2, 'local')
     ON CONFLICT (identifier) DO UPDATE SET role = EXCLUDED.role`,
    [identifier, role]
  );
}

export async function ensureLocalAdminUser(options: {
  identifier?: string;
  displayName?: string;
  password: string;
}): Promise<UserAccount> {
  const identifier = options.identifier ?? 'admin';
  const displayName = options.displayName ?? 'Admin';

  // Ensure row exists and role is admin
  await pool.query(
    `INSERT INTO user_accounts (identifier, display_name, preferences, role, auth_provider)
     VALUES ($1, $2, '{}'::jsonb, 'admin', 'local')
     ON CONFLICT (identifier) DO UPDATE SET role = 'admin'`,
    [identifier, displayName]
  );

  // Only set password hash if missing
  const existing = await pool.query(`SELECT * FROM user_accounts WHERE identifier = $1 LIMIT 1`, [
    identifier,
  ]);
  const row = existing.rows[0] as UserAccountRow;
  const existingHash = readPasswordHash(row);
  if (!existingHash) {
    const passwordHash = await hashPassword(options.password);
    await pool.query(
      `UPDATE user_accounts
       SET password_hash = $2, last_login_at = COALESCE(last_login_at, NOW())
       WHERE identifier = $1`,
      [identifier, passwordHash]
    );
  }

  const updated = await getUserByIdentifier(identifier);
  if (!updated) {
    throw new Error('Failed to ensure local admin user');
  }
  return updated;
}

export async function verifyLocalUserPassword(options: {
  identifier: string;
  password: string;
}): Promise<{ ok: true; user: UserAccount } | { ok: false; error: 'invalid-credentials' }> {
  const res = await pool.query(`SELECT * FROM user_accounts WHERE identifier = $1 LIMIT 1`, [
    options.identifier,
  ]);
  if (res.rows.length === 0) return { ok: false, error: 'invalid-credentials' };

  const row = res.rows[0] as UserAccountRow;
  const passwordHash = readPasswordHash(row);
  if (!passwordHash) return { ok: false, error: 'invalid-credentials' };

  const ok = await verifyPassword(options.password, passwordHash);
  if (!ok) return { ok: false, error: 'invalid-credentials' };

  await pool.query(`UPDATE user_accounts SET last_login_at = NOW() WHERE identifier = $1`, [
    options.identifier,
  ]);

  return { ok: true, user: rowToUserAccount(row) };
}

/**
 * Get user preferences by identifier.
 * Returns default preferences if user doesn't exist.
 */
export async function getUserPreferences(identifier = 'default'): Promise<UserPreferences> {
  const user = await getUserByIdentifier(identifier);
  return user?.preferences ?? { workspaceMode: 'wizard' };
}

/**
 * Update user preferences.
 * Merges with existing preferences (does not replace).
 */
export async function updateUserPreferences(
  identifier: string,
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  // Ensure user exists
  if (identifier === 'default') {
    await getOrCreateDefaultUser();
  }

  const res = await pool.query(
    `UPDATE user_accounts
     SET preferences = preferences || $2::jsonb
     WHERE identifier = $1
     RETURNING *`,
    [identifier, JSON.stringify(preferences)]
  );

  if (res.rows.length === 0) {
    throw new Error(`User not found: ${identifier}`);
  }

  const row = res.rows[0] as UserAccountRow;
  return parsePreferences(row.preferences);
}

/**
 * Set the workspace mode preference.
 * Convenience function for the common use case.
 */
export async function setWorkspaceModePreference(
  identifier: string,
  mode: 'wizard' | 'compact'
): Promise<void> {
  await updateUserPreferences(identifier, { workspaceMode: mode });
}

/**
 * Get the workspace mode preference.
 * Returns 'wizard' if not set.
 */
export async function getWorkspaceModePreference(
  identifier = 'default'
): Promise<'wizard' | 'compact'> {
  const prefs = await getUserPreferences(identifier);
  return prefs.workspaceMode ?? 'wizard';
}
