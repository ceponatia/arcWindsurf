/**
 * Generate a UUID using cryptographically secure randomness.
 *
 * Prefers the built-in crypto.randomUUID(), with secure fallbacks for
 * environments where it is not available.
 */
export function generateId(): string {
  // 1. Try global crypto.randomUUID (browser / modern Node environments)
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Ignore and attempt other fallbacks
  }

  // 2. Try Node's crypto.randomUUID() via require, if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto') as typeof import('crypto');
    if (nodeCrypto && typeof nodeCrypto.randomUUID === 'function') {
      return nodeCrypto.randomUUID();
    }
    if (nodeCrypto && typeof nodeCrypto.randomBytes === 'function') {
      const bytes = nodeCrypto.randomBytes(16);
      // Format as RFC4122 version 4 UUID
      const b6 = bytes[6];
      const b8 = bytes[8];
      if (b6 !== undefined && b8 !== undefined) {
        bytes[6] = (b6 & 0x0f) | 0x40;
        bytes[8] = (b8 & 0x3f) | 0x80;
      }
      const hex = bytes.toString('hex');
      return (
        hex.slice(0, 8) +
        '-' +
        hex.slice(8, 12) +
        '-' +
        hex.slice(12, 16) +
        '-' +
        hex.slice(16, 20) +
        '-' +
        hex.slice(20, 32)
      );
    }
  } catch {
    // Ignore and attempt other fallbacks
  }

  // 3. Try browser crypto.getRandomValues
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.getRandomValues === 'function'
    ) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // Per RFC4122 section 4.4: set version and variant bits
      const b6 = bytes[6];
      const b8 = bytes[8];
      if (b6 !== undefined && b8 !== undefined) {
        bytes[6] = (b6 & 0x0f) | 0x40;
        bytes[8] = (b8 & 0x3f) | 0x80;
      }
      const hex: string[] = [];
      for (const b of bytes) {
        hex.push(b.toString(16).padStart(2, '0'));
      }
      return (
        hex.slice(0, 4).join('') +
        hex.slice(4, 6).join('') +
        '-' +
        hex.slice(6, 8).join('') +
        '-' +
        hex.slice(8, 10).join('') +
        '-' +
        hex.slice(10, 12).join('') +
        '-' +
        hex.slice(12, 16).join('')
      );
    }
  } catch {
    // Ignore and fall through
  }

  // If we reach this point, no cryptographically secure generator is available.
  // Failing fast is safer than silently using Math.random() in a security context.
  throw new Error('generateId: No cryptographically secure random API available');
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

/**
 * Generate a UUID in a compact (no dashes) hex format.
 *
 * Useful for building composite IDs where '-' is reserved as a delimiter.
 * Example output: 89dcf560f1444bc6a3cddad235ed4351
 */
export function generateCompactUuid(): string {
  return generateId().replace(/-/g, '');
}

/**
 * Generate a short opaque ID.
 *
 * This is derived from a cryptographically-secure UUID, then compacted.
 * Output is lowercase hex.
 */
export function generateShortId(length = 8): string {
  const safeLength = Math.max(1, Math.min(32, Math.floor(length)));
  return generateCompactUuid().slice(0, safeLength).toLowerCase();
}

/**
 * Generate a UI-local ID safe for use in composite IDs.
 *
 * Format: {prefix}_{shortHex}
 * - Avoids '-' so callers can safely compose IDs using '-' as a delimiter
 * - Uses cryptographically secure randomness (via generateId)
 */
export function generateLocalId(prefix: string, shortLength = 12): string {
  const trimmedPrefix = prefix.trim();
  const safePrefix = trimmedPrefix.length > 0 ? trimmedPrefix : 'id';
  return `${safePrefix}_${generateShortId(shortLength)}`;
}

/**
 * Returns true if the value is a RFC4122-compliant UUID string.
 *
 * Validates UUID format with version 1-5 and variant 8-B.
 * Useful for validating entity profile IDs and other UUID-based identifiers.
 */
export function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

/**
 * Coerce a plain string to a SessionId branded type.
 * Use when passing session IDs to @minimal-rpg/db functions.
 *
 * Note: This is a type-level coercion only. The runtime value remains a string.
 */
export function toSessionId<T extends string>(id: T): T {
  return id;
}

/**
 * Coerce a plain string to an EntityProfileId branded type.
 * Use when passing entity profile IDs to @minimal-rpg/db functions.
 *
 * Note: This is a type-level coercion only. The runtime value remains a string.
 */
export function toEntityProfileId<T extends string>(id: T): T {
  return id;
}

/**
 * Coerce a plain string to a generic ID branded type.
 * Use when passing generic IDs to @minimal-rpg/db functions.
 *
 * Note: This is a type-level coercion only. The runtime value remains a string.
 */
export function toId<T extends string>(id: T): T {
  return id;
}

/**
 * Coerce an array of plain strings to branded ID types.
 * Use with inArray() and similar functions that accept multiple IDs.
 *
 * Note: This is a type-level coercion only. The runtime values remain strings.
 */
export function toIds<T extends string>(ids: T[]): T[] {
  return ids;
}
