/**
 * URL sanitization and validation utilities
 */

/**
 * Regex pattern for redacting credentials in URLs
 * Safe against ReDoS with bounded quantifiers and restricted character classes
 * Note: Creates a new regex each time to avoid global flag state issues
 */
function getCredentialRedactionPattern(): RegExp {
  return /:\/\/([^:@\s]{1,256}):([^@\s]{1,256})@/g;
}

/**
 * Sanitizes a URL by removing sensitive information and validating its structure
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: must be a non-empty string');
  }

  try {
    // Parse and validate URL structure
    const parsedUrl = new URL(url);

    // Redact sensitive information
    if (parsedUrl.password) {
      parsedUrl.password = '***';
    }

    // Validate protocol is allowed
    const allowedProtocols = ['http:', 'https:', 'postgresql:', 'postgres:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
    }

    return parsedUrl.toString();
  } catch (error) {
    // Fallback for malformed URLs - basic redaction
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      // Safe regex with limited backtracking - matches username:password@ pattern
      return url.replace(getCredentialRedactionPattern(), '://$1:***@');
    }
    throw error;
  }
}

/**
 * Safely checks if a URL contains a specific domain without substring vulnerabilities
 */
export function isUrlDomain(url: string, domain: string): boolean {
  try {
    const sanitizedUrl = sanitizeUrl(url);
    const parsedUrl = new URL(sanitizedUrl);

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
    return sanitizeUrl(url);
  } catch {
    // If sanitization fails, apply basic redaction
    // Safe regex with limited backtracking - matches username:password@ pattern
    return url.replace(getCredentialRedactionPattern(), '://$1:***@');
  }
}
