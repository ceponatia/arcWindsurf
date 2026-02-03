import type { Context } from 'hono';
import { z, type ZodSchema } from 'zod';
import { isUuid } from '@minimal-rpg/utils';
import { badRequest } from './responses.js';

/**
 * Result of a validation operation.
 */
export type ValidationResult<T> =
  | {
    success: true;
    data: T;
  }
  | {
    success: false;
    errorResponse: Response;
  };

/**
 * Validate request body with Zod schema.
 *
 * @param c - Hono context
 * @param schema - Zod schema to validate against
 * @returns Validation result with data or error response
 *
 * @example
 * const result = await validateBody(c, CreateSessionRequestSchema);
 * if (!result.success) return result.errorResponse;
 * const { characterId, settingId } = result.data;
 */
export async function validateBody<T>(
  c: Context,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return {
      success: false,
      errorResponse: badRequest(c, 'invalid json body'),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      errorResponse: badRequest(c, result.error.flatten()),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate optional request body with Zod schema.
 * Returns undefined if body is missing or empty.
 *
 * @param c - Hono context
 * @param schema - Zod schema to validate against
 * @returns Validation result with optional data or error response
 */
export async function validateOptionalBody<T>(
  c: Context,
  schema: ZodSchema<T>
): Promise<ValidationResult<T | undefined>> {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    // Empty or invalid JSON for optional body is ok
    return {
      success: true,
      data: undefined,
    };
  }

  if (body === null || body === undefined) {
    return {
      success: true,
      data: undefined,
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      errorResponse: badRequest(c, result.error.flatten()),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate query params with a Zod schema.
 */
export function validateQuery<T>(c: Context, schema: ZodSchema<T>): ValidationResult<T> {
  const result = schema.safeParse(c.req.query());

  if (!result.success) {
    return {
      success: false,
      errorResponse: badRequest(c, result.error.flatten()),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate a route parameter with a Zod schema.
 */
export function validateParam<T>(
  c: Context,
  paramName: string,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const result = schema.safeParse(c.req.param(paramName));

  if (!result.success) {
    return {
      success: false,
      errorResponse: badRequest(c, result.error.flatten()),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate a UUID route parameter.
 */
export function validateParamId(c: Context, paramName = 'id'): ValidationResult<string> {
  return validateParam(c, paramName, z.string().refine(isUuid, 'invalid id'));
}
