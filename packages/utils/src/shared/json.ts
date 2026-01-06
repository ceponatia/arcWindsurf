import type { ZodSchema } from 'zod';

/**
 * Safely parse JSON with typed fallback.
 * @param text - JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @returns Parsed value or fallback
 */
export function safeParseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse JSON or return undefined.
 * @param text - JSON string to parse
 * @returns Parsed value or undefined
 */
export function tryParseJson<T>(text: string | null | undefined): T | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/**
 * Extract a single field from JSON string.
 * @param text - JSON string to parse
 * @param field - Field name to extract
 * @returns Field value or undefined
 */
export function extractJsonField<T>(text: string | null | undefined, field: string): T | undefined {
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const value = parsed[field];
    return value as T | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Validate and parse with Zod schema.
 * @param text - JSON string to parse
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated value or undefined
 */
export function parseWithSchema<T>(
  text: string | null | undefined,
  schema: ZodSchema<T>
): T | undefined {
  if (!text) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
