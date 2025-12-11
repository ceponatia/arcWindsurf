import { randomUUID } from 'node:crypto';

/**
 * Generate a UUID, with fallback for edge cases.
 * Uses crypto.randomUUID() with a timestamp-based fallback.
 */
export function generateId(): string {
  try {
    return randomUUID();
  } catch {
    // Fallback for environments where crypto.randomUUID() might fail
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Generate a prefixed ID (e.g., "char-abc123").
 * Useful for creating human-readable IDs with type hints.
 */
export function generatePrefixedId(prefix: string): string {
  const uuid = generateId();
  // Use first 8 characters of UUID for brevity
  const short = uuid.split('-')[0] ?? uuid.slice(0, 8);
  return `${prefix}-${short}`;
}

/**
 * Generate a session-scoped instance ID.
 * Format: {templateId}-{uuid}
 */
export function generateInstanceId(templateId: string): string {
  return `${templateId}-${generateId()}`;
}
