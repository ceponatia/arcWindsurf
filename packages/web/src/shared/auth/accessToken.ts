import { getSupabaseClient } from '../supabase/client.js';
import { getAuthToken } from './token.js';

/**
 * Returns the best available bearer token for API requests.
 *
 * Priority:
 * 1) Supabase session access token (if configured)
 * 2) Legacy local token from localStorage
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  return getAuthToken();
}
