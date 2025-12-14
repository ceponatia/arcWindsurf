/**
 * User Account Database Functions
 *
 * Minimal implementation for storing user preferences.
 * Full authentication not implemented yet.
 */
import { pool } from './client.js';
import type { DbRow, UUID } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * User preferences stored in the database.
 */
export interface UserPreferences {
  /** Preferred workspace mode: wizard (step-by-step) or compact (power user) */
  workspaceMode?: 'wizard' | 'compact';
  /** Future preferences can be added here */
  [key: string]: unknown;
}

/**
 * User account record.
 */
export interface UserAccount {
  id: UUID;
  identifier: string;
  displayName: string | null;
  preferences: UserPreferences;
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
  preferences: unknown;
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

function parsePreferences(raw: unknown): UserPreferences {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as UserPreferences;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as UserPreferences;
      }
    } catch {
      // ignore
    }
  }
  return {};
}

function rowToUserAccount(row: UserAccountRow): UserAccount {
  return {
    id: row.id,
    identifier: row.identifier,
    displayName: row.display_name,
    preferences: parsePreferences(row.preferences),
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
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

/**
 * Get user preferences by identifier.
 * Returns default preferences if user doesn't exist.
 */
export async function getUserPreferences(identifier: string = 'default'): Promise<UserPreferences> {
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
  identifier: string = 'default'
): Promise<'wizard' | 'compact'> {
  const prefs = await getUserPreferences(identifier);
  return prefs.workspaceMode ?? 'wizard';
}
