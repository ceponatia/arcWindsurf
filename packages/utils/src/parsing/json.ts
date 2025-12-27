/**
 * Parse JSON into `unknown` to avoid leaking `any`.
 */
export function parseJson(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

/**
 * Parse JSON and validate with a schema that supports `safeParse`.
 * Throws an error when validation fails.
 */
export function parseJsonWithSchema<T>(
  raw: string,
  schema: {
    safeParse: (
      value: unknown
    ) => { success: true; data: T } | { success: false; error: { message: string } };
  }
): T {
  const parsed = parseJson(raw);
  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}
