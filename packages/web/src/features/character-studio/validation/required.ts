/**
 * Generic required-field validation helpers for Character Studio.
 */

/**
 * @param value - unknown input value
 * @returns trimmed string if value is a string, otherwise empty string
 */
export function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validate a required string field.
 *
 * @param value - field value
 * @param label - user-facing label for the field
 * @returns error message if invalid, otherwise undefined
 */
export function validateRequiredString(value: unknown, label: string): string | undefined {
  const s = toTrimmedString(value);
  if (s.length === 0) return `${label} is required.`;
  return undefined;
}
