/**
 * URL sanitization and validation utilities for database package
 */

/**
 * Safely checks if a URL contains a specific domain without substring vulnerabilities
 */
export function isUrlDomain(url: string, domain: string): boolean {
  try {
    if (!url || typeof url !== 'string') {
      return false;
    }

    const parsedUrl = new URL(url);

    // Check exact hostname match or subdomain
    return parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`);
  } catch {
    // If URL parsing fails, return false for safety
    return false;
  }
}

/**
 * Checks if a URL is a Supabase URL using proper domain validation
 */
export function isSupabaseUrl(url: string): boolean {
  const supabaseDomains = ['supabase.co', 'supabase.com', 'pooler.supabase.com'];

  return supabaseDomains.some(domain => isUrlDomain(url, domain));
}

/**
 * Redacts sensitive information from a URL for logging
 */
export function redactUrlForLogging(url: string): string {
  try {
    if (!url || typeof url !== 'string') {
      return '[invalid url]';
    }

    const parsedUrl = new URL(url);

    // Redact sensitive information
    if (parsedUrl.password) {
      parsedUrl.password = '***';
    }

    return parsedUrl.toString();
  } catch {
    // Fallback for malformed URLs - basic redaction
    return url.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:***@');
  }
}
