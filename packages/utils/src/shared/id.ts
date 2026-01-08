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
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    if (nodeCrypto && typeof nodeCrypto.randomUUID === 'function') {
      return nodeCrypto.randomUUID();
    }
    if (nodeCrypto && typeof nodeCrypto.randomBytes === 'function') {
      const bytes: Buffer = nodeCrypto.randomBytes(16);
      // Format as RFC4122 version 4 UUID
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
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
      typeof (crypto as Crypto).getRandomValues === 'function'
    ) {
      const bytes = new Uint8Array(16);
      (crypto as Crypto).getRandomValues(bytes);
      // Per RFC4122 section 4.4: set version and variant bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex: string[] = [];
      for (let i = 0; i < bytes.length; i++) {
        hex.push(bytes[i].toString(16).padStart(2, '0'));
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
