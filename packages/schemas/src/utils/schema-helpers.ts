import { z } from 'zod';

/**
 * Helper to create a nullable optional schema that defaults to undefined.
 * Useful for optional fields that might come in as null from databases.
 */
export const nullableOptional = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([schema, z.null()])
    .optional()
    .transform((val) => (val === null ? undefined : val));

/**
 * Helper to create a schema that coerces a string to a number, returning undefined if the string is empty or invalid.
 */
export const numericString = z.string().transform((val) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? undefined : parsed;
});
