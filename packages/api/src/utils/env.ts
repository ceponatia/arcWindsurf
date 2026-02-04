/**
 * Environment variable helpers for the API service.
 */

/**
 * Read a raw environment variable value.
 */
export function getEnvValue(name: string): string | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(process.env, name);
  if (!descriptor || typeof descriptor.value !== 'string') {
    return undefined;
  }
  return descriptor.value;
}

/**
 * Read a boolean environment variable (true/false).
 */
export function getEnvFlag(name: string): boolean {
  return getEnvValue(name) === 'true';
}

/**
 * Read a comma-separated environment variable as a list.
 */
export function getEnvCsv(name: string): string[] {
  const raw = getEnvValue(name) ?? '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
