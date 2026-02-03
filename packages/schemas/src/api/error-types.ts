/**
 * Standard API error response shape.
 */
export interface ApiError {
  ok: false;
  error: string | Record<string, unknown>;
  /** Optional validation details */
  details?: unknown;
}

/**
 * Standard API success response shape.
 */
export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}

/**
 * Union type for API responses.
 */
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
