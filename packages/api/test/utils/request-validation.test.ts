import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'hono';
import { z } from 'zod';
import { validateBody, validateOptionalBody } from '../../src/utils/request-validation.js';

describe('utils/request-validation', () => {
  const mockJson = vi.fn();
  const mockReqJson = vi.fn();
  const mockContext = {
    req: {
      json: mockReqJson,
    },
    json: mockJson,
  } as unknown as Context;

  const TestSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateBody', () => {
    it('should return success with valid data', async () => {
      const validData = { name: 'Test', age: 25 };
      mockReqJson.mockResolvedValue(validData);

      const result = await validateBody(mockContext, TestSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should return error response when json parsing fails', async () => {
      mockReqJson.mockRejectedValue(new Error('Invalid JSON'));

      const result = await validateBody(mockContext, TestSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            ok: false,
            error: 'invalid json body',
          }),
          400
        );
      }
    });

    it('should return error response when validation fails', async () => {
      const invalidData = { name: 'Test', age: 'invalid' };
      mockReqJson.mockResolvedValue(invalidData);

      const result = await validateBody(mockContext, TestSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            ok: false,
            error: expect.objectContaining({
              fieldErrors: {
                age: expect.any(Array),
              },
            }),
          }),
          400
        );
      }
    });
  });

  describe('validateOptionalBody', () => {
    it('should return success with valid data', async () => {
      const validData = { name: 'Test', age: 25 };
      mockReqJson.mockResolvedValue(validData);

      const result = await validateOptionalBody(mockContext, TestSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should return success with undefined when body is missing (json parse error)', async () => {
      mockReqJson.mockRejectedValue(new Error('Unexpected end of JSON input'));

      const result = await validateOptionalBody(mockContext, TestSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    it('should return success with undefined when body is null', async () => {
      mockReqJson.mockResolvedValue(null);

      const result = await validateOptionalBody(mockContext, TestSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    it('should return error response when validation fails', async () => {
      const invalidData = { name: 'Test', age: 'invalid' };
      mockReqJson.mockResolvedValue(invalidData);

      const result = await validateOptionalBody(mockContext, TestSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            ok: false,
            error: expect.objectContaining({
              fieldErrors: {
                age: expect.any(Array),
              },
            }),
          }),
          400
        );
      }
    });
  });
});
