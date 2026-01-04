import { describe, it, expect, vi, afterEach } from 'vitest';
import { signAuthToken, verifyAuthToken, getAuthSecret } from '../../src/auth/token.js';
import type { AuthTokenPayload } from '../../src/auth/types.js';

describe('auth/token', () => {
  const secret = 'test-secret-key-123456';
  const payload: AuthTokenPayload = {
    sub: 'user-123',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  describe('getAuthSecret', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return secret from env', () => {
      process.env = { ...originalEnv, AUTH_SECRET: 'my-super-secret-key' };
      expect(getAuthSecret()).toBe('my-super-secret-key');
    });

    it('should return dev fallback if env missing and not production', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      delete process.env['AUTH_SECRET'];
      expect(getAuthSecret()).toBe('dev-secret-change-me');
    });

    it('should return empty string if env missing and production', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' };
      delete process.env['AUTH_SECRET'];
      expect(getAuthSecret()).toBe('');
    });
  });

  describe('signAuthToken', () => {
    it('should generate a valid JWT structure', () => {
      const token = signAuthToken(payload, secret);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBeDefined(); // Header
      expect(parts[1]).toBeDefined(); // Payload
      expect(parts[2]).toBeDefined(); // Signature
    });
  });

  describe('verifyAuthToken', () => {
    it('should verify a valid token', () => {
      const token = signAuthToken(payload, secret);
      const result = verifyAuthToken(token, secret);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload).toEqual(payload);
      }
    });

    it('should fail with invalid signature', () => {
      const token = signAuthToken(payload, secret);
      const result = verifyAuthToken(token, 'wrong-secret');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('invalid');
      }
    });

    it('should fail with malformed token', () => {
      const result = verifyAuthToken('invalid.token', secret);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('invalid');
      }
    });

    it('should fail with expired token', () => {
      const expiredPayload = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };
      const token = signAuthToken(expiredPayload, secret);
      const result = verifyAuthToken(token, secret);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('expired');
      }
    });

    it('should fail if payload is missing required fields', () => {
      // Manually construct a token with missing fields
      // We can't use signAuthToken easily because it takes AuthTokenPayload which is typed
      // But we can mock the payload passed to it if we cast it
      const invalidPayload = {
        sub: 'user-123',
        // role missing
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      } as unknown as AuthTokenPayload;

      const token = signAuthToken(invalidPayload, secret);
      const result = verifyAuthToken(token, secret);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('invalid');
      }
    });
  });
});
