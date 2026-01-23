import { describe, it, expect, vi, beforeEach } from 'vitest';

const poolQuery = vi.fn();

vi.mock('../src/utils/client.js', () => ({
  pool: { query: poolQuery },
}));

vi.mock('node:crypto', () => ({
  default: {
    randomBytes: () => Buffer.alloc(16, 1),
    scrypt: (password: string, salt: Buffer, keyLen: number, _opts: unknown, cb: (err: Error | null, key: Buffer) => void) => {
      const _ = password;
      const __ = salt;
      cb(null, Buffer.alloc(keyLen, 2));
    },
    timingSafeEqual: (a: Buffer, b: Buffer) => a.equals(b),
  },
  randomBytes: () => Buffer.alloc(16, 1),
  scrypt: (password: string, salt: Buffer, keyLen: number, _opts: unknown, cb: (err: Error | null, key: Buffer) => void) => {
    const _ = password;
    const __ = salt;
    cb(null, Buffer.alloc(keyLen, 2));
  },
  timingSafeEqual: (a: Buffer, b: Buffer) => a.equals(b),
}));

import {
  getUserByIdentifier,
  getUserRoleByIdentifier,
  getOrCreateDefaultUser,
  ensureUserByEmail,
  ensureLocalAdminUser,
  verifyLocalUserPassword,
  getUserPreferences,
  updateUserPreferences,
  getWorkspaceModePreference,
} from '../src/repositories/users.js';

describe('users repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets users by identifier and role', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [] });
    const missing = await getUserByIdentifier('missing');
    expect(missing).toBeNull();

    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-1',
          identifier: 'user-1',
          display_name: 'User',
          role: 'admin',
          auth_provider: 'local',
          preferences: { workspaceMode: 'compact' },
          created_at: new Date('2026-01-22T00:00:00.000Z'),
          updated_at: new Date('2026-01-22T00:00:00.000Z'),
        },
      ],
    });

    const found = await getUserByIdentifier('user-1');
    expect(found?.id).toBe('user-1');
    expect(found?.role).toBe('admin');

    poolQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    const role = await getUserRoleByIdentifier('user-1');
    expect(role).toBe('admin');
  });

  it('creates default user when missing', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [] });
    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'default',
          identifier: 'default',
          display_name: 'Default User',
          role: 'user',
          auth_provider: 'local',
          preferences: { workspaceMode: 'wizard' },
          created_at: new Date('2026-01-22T00:00:00.000Z'),
          updated_at: new Date('2026-01-22T00:00:00.000Z'),
        },
      ],
    });

    const user = await getOrCreateDefaultUser();
    expect(user.identifier).toBe('default');
  });

  it('ensures users by email', async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-2',
          identifier: 'user-2',
          email: 'user@example.com',
          display_name: 'User',
          role: 'user',
          auth_provider: 'local',
          preferences: {},
          created_at: new Date('2026-01-22T00:00:00.000Z'),
          updated_at: new Date('2026-01-22T00:00:00.000Z'),
        },
      ],
    });

    const user = await ensureUserByEmail({ email: 'User@Example.com' });
    expect(user.identifier).toBe('user@example.com');
  });

  it('ensures local admin and sets password if missing', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [] });
    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'admin',
          identifier: 'admin',
          display_name: 'Admin',
          role: 'admin',
          auth_provider: 'local',
          preferences: {},
          password_hash: null,
          created_at: new Date('2026-01-22T00:00:00.000Z'),
          updated_at: new Date('2026-01-22T00:00:00.000Z'),
        },
      ],
    });
    poolQuery.mockResolvedValueOnce({ rowCount: 1 });
    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'admin',
          identifier: 'admin',
          display_name: 'Admin',
          role: 'admin',
          auth_provider: 'local',
          preferences: {},
          created_at: new Date('2026-01-22T00:00:00.000Z'),
          updated_at: new Date('2026-01-22T00:00:00.000Z'),
        },
      ],
    });

    const user = await ensureLocalAdminUser({ password: 'secret' });
    expect(user.role).toBe('admin');
  });

  it('verifies local user passwords', async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-3',
          identifier: 'user-3',
          display_name: 'User',
          role: 'user',
          auth_provider: 'local',
          preferences: {},
          password_hash: 'scrypt:16384:8:1:AAAA:AAAA',
          created_at: new Date('2026-01-22T00:00:00.000Z'),
          updated_at: new Date('2026-01-22T00:00:00.000Z'),
        },
      ],
    });
    poolQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await verifyLocalUserPassword({ identifier: 'user-3', password: 'secret' });
    expect(result.ok).toBe(true);
  });

  it('returns default preferences when missing', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [] });
    const prefs = await getUserPreferences('missing');
    expect(prefs.workspaceMode).toBe('wizard');
  });

  it('updates preferences and returns merged values', async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          preferences: { workspaceMode: 'compact' },
        },
      ],
    });

    const prefs = await updateUserPreferences('user-4', { workspaceMode: 'compact' });
    expect(prefs.workspaceMode).toBe('compact');
  });

  it('gets workspace mode preference', async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-5',
          identifier: 'user-5',
          display_name: 'User',
          role: 'user',
          auth_provider: 'local',
          preferences: { workspaceMode: 'compact' },
          created_at: new Date('2026-01-22T00:00:00.000Z'),
          updated_at: new Date('2026-01-22T00:00:00.000Z'),
        },
      ],
    });

    const mode = await getWorkspaceModePreference('user-5');
    expect(mode).toBe('compact');
  });
});
