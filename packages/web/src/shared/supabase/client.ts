import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseEnv } from './types.js';

function readSupabaseEnv(): SupabaseEnv | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) return null;

  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();

  if (!trimmedUrl || !trimmedKey) return null;

  return { url: trimmedUrl, anonKey: trimmedKey };
}

let cached: SupabaseClient | null | undefined;

/**
 * Returns a singleton Supabase client (or null if env is missing).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const env = readSupabaseEnv();
  if (!env) {
    cached = null;
    return cached;
  }

  cached = createClient(env.url, env.anonKey, {
    auth: {
      // IMPORTANT: This app uses hash-based routing (window.location.hash).
      // Supabase's implicit flow returns tokens in the URL hash which can get
      // overwritten by the router before Supabase can read them.
      // PKCE returns a `?code=...` in the query string instead.
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cached;
}
