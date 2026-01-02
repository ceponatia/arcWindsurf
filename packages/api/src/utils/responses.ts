import type { Context } from 'hono';
import type { ApiError } from '../types.js';

/**
 * Return a 404 Not Found error response.
 */
export function notFound(c: Context, message = 'not found'): Response {
  return c.json({ ok: false, error: message } satisfies ApiError, 404);
}

/**
 * Return a 400 Bad Request error response.
 */
export function badRequest(c: Context, error: string | Record<string, unknown>): Response {
  return c.json({ ok: false, error } satisfies ApiError, 400);
}

/**
 * Return a 500 Internal Server Error response.
 */
export function serverError(c: Context, error: string): Response {
  return c.json({ ok: false, error } satisfies ApiError, 500);
}

/**
 * Return a 403 Forbidden error response.
 */
export function forbidden(c: Context, message = 'forbidden'): Response {
  return c.json({ ok: false, error: message } satisfies ApiError, 403);
}

/**
 * Return a 409 Conflict error response.
 */
export function conflict(c: Context, message = 'conflict'): Response {
  return c.json({ ok: false, error: message } satisfies ApiError, 409);
}

/**
 * Return a 204 No Content response.
 */
export function noContent(c: Context): Response {
  return c.body(null, 204);
}
