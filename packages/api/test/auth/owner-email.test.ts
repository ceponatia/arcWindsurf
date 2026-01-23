import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'hono';

const authMocks = vi.hoisted(() => ({
  getAuthUserMock: vi.fn(),
}));

vi.mock('../../src/auth/middleware.js', () => ({
  getAuthUser: authMocks.getAuthUserMock,
}));

import { getOwnerEmail, normalizeOwnerEmail } from '../../src/auth/ownerEmail.js';

describe('auth/ownerEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes owner emails', () => {
    expect(normalizeOwnerEmail(' Admin@Example.Com ')).toBe('admin@example.com');
  });

  it('throws on empty owner emails', () => {
    expect(() => normalizeOwnerEmail('')).toThrow('Owner email is required');
  });

  it('throws on public owner emails', () => {
    expect(() => normalizeOwnerEmail('public')).toThrow('Owner email must not be "public"');
  });

  it('returns user email when available', () => {
    authMocks.getAuthUserMock.mockReturnValue({ email: 'User@Example.com', identifier: 'user-1', role: 'user' });

    const owner = getOwnerEmail({} as Context);

    expect(owner).toBe('user@example.com');
  });

  it('returns identifier when email is missing', () => {
    authMocks.getAuthUserMock.mockReturnValue({ email: null, identifier: 'User-Id', role: 'user' });

    const owner = getOwnerEmail({} as Context);

    expect(owner).toBe('user-id');
  });

  it('returns local when auth user is missing', () => {
    authMocks.getAuthUserMock.mockReturnValue(null);

    const owner = getOwnerEmail({} as Context);

    expect(owner).toBe('local');
  });
});
