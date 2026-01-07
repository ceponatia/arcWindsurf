import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'hono';
import {
  notFound,
  badRequest,
  serverError,
  forbidden,
  conflict,
  noContent,
} from '../../src/utils/responses.js';

describe('utils/responses', () => {
  const mockJson = vi.fn();
  const mockBody = vi.fn();
  const mockContext = {
    json: mockJson,
    body: mockBody,
  } as unknown as Context;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notFound', () => {
    it('should return 404 with default message', () => {
      notFound(mockContext);
      expect(mockJson).toHaveBeenCalledWith({ ok: false, error: 'not found' }, 404);
    });

    it('should return 404 with custom message', () => {
      notFound(mockContext, 'custom error');
      expect(mockJson).toHaveBeenCalledWith({ ok: false, error: 'custom error' }, 404);
    });
  });

  describe('badRequest', () => {
    it('should return 400 with error string', () => {
      badRequest(mockContext, 'bad input');
      expect(mockJson).toHaveBeenCalledWith({ ok: false, error: 'bad input' }, 400);
    });

    it('should return 400 with error object', () => {
      const errorObj = { field: 'invalid' };
      badRequest(mockContext, errorObj);
      expect(mockJson).toHaveBeenCalledWith({ ok: false, error: errorObj }, 400);
    });
  });

  describe('serverError', () => {
    it('should return 500 with error message', () => {
      serverError(mockContext, 'internal error');
      expect(mockJson).toHaveBeenCalledWith({ ok: false, error: 'internal error' }, 500);
    });
  });

  describe('forbidden', () => {
    it('should return 403 with default message', () => {
      forbidden(mockContext);
      expect(mockJson).toHaveBeenCalledWith({ ok: false, error: 'forbidden' }, 403);
    });

    it('should return 403 with custom message', () => {
      forbidden(mockContext, 'access denied');
      expect(mockJson).toHaveBeenCalledWith({ ok: false, error: 'access denied' }, 403);
    });
  });

  describe('conflict', () => {
    it('should return 409 with default message', () => {
      conflict(mockContext);
      expect(mockJson).toHaveBeenCalledWith({ ok: false, error: 'conflict' }, 409);
    });

    it('should return 409 with custom message', () => {
      conflict(mockContext, 'duplicate entry');
      expect(mockJson).toHaveBeenCalledWith({ ok: false, error: 'duplicate entry' }, 409);
    });
  });

  describe('noContent', () => {
    it('should return 204 with null body', () => {
      noContent(mockContext);
      expect(mockBody).toHaveBeenCalledWith(null, 204);
    });
  });
});
