import { useCallback, useEffect, useMemo, useState } from 'react';
import { authLogin, authMe } from '../api/client.js';
import type { AuthUser } from '../auth/types.js';
import { clearAuthToken, getAuthToken, setAuthToken } from '../auth/token.js';
import { getSupabaseClient } from '../supabase/client.js';

function getRedirectUrlForMagicLink(): string {
  try {
    const u = new URL(globalThis.location?.href ?? '');
    u.search = '';

    // IMPORTANT:
    // Supabase validates `emailRedirectTo` against the allowlisted Redirect URLs.
    // Hash fragments are frequently not included in that allowlist matching.
    // Use a clean origin+path URL (no hash) so `https://ceponatia.github.io/rpg-light/`
    // matches. The app will normalize hash routing on load.
    u.hash = '';

    return u.toString();
  } catch {
    const origin = globalThis.location?.origin ?? '';
    return origin ? `${origin}/` : '';
  }
}

export interface UseAuthState {
  user: AuthUser | null;
  isAdmin: boolean;
  hasToken: boolean;
  loading: boolean;
  error: string | null;
  pendingMagicLink: boolean;
  magicLinkSentTo: string | null;
  refresh: () => Promise<void>;
  login: (params: { email: string } | { identifier: string; password: string }) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenSnapshot, setTokenSnapshot] = useState<string | null>(() => getAuthToken());
  const [pendingMagicLink, setPendingMagicLink] = useState<boolean>(false);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);

  const hasToken = Boolean(tokenSnapshot);
  const isAdmin = user?.role === 'admin';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      let supabaseToken: string | null = null;
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        supabaseToken = data.session?.access_token ?? null;
        if (!supabaseToken) {
          setUser(null);
          setTokenSnapshot(null);
          return;
        }
        // Mirror into local storage so any non-supabase paths still work.
        setAuthToken(supabaseToken);
        setTokenSnapshot(supabaseToken);
      }

      const res = await authMe();
      setUser(res.user);
      if (supabaseToken && !res.user) {
        setError(
          'Signed into Supabase, but the API did not recognize this session. Check VITE_API_BASE_URL and ensure the API is configured with SUPABASE_JWT_ISSUER / SUPABASE_PROJECT_URL for the same Supabase project.'
        );
      }
    } catch (e) {
      setUser(null);
      setError(e instanceof Error ? e.message : 'Failed to load auth status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial refresh
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;

      if (token) {
        // Mirror into local storage so any non-supabase paths still work.
        setAuthToken(token);
        setTokenSnapshot(token);
      } else {
        clearAuthToken();
        setTokenSnapshot(null);
        setUser(null);
      }

      void refresh();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  const login = useCallback(
    async (params: { email: string } | { identifier: string; password: string }) => {
      setLoading(true);
      setError(null);
      setMagicLinkSentTo(null);
      try {
        const supabase = getSupabaseClient();

        if (supabase) {
          setPendingMagicLink(true);
          const email = ('email' in params ? params.email : params.identifier).trim();
          if (!email) throw new Error('Email is required');

          const { error: signInErr } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: getRedirectUrlForMagicLink(),
            },
          });

          if (signInErr) throw signInErr;

          setMagicLinkSentTo(email);

          // User still needs to click the email link. We'll update state when the
          // session appears (refresh runs on mount + tokenSnapshot changes).
          return;
        }

        // Fallback to legacy local auth (dev-only)
        if (!('identifier' in params)) {
          throw new Error('Local auth requires identifier + password');
        }

        const res = await authLogin({
          identifier: params.identifier.trim(),
          password: params.password,
        });
        setAuthToken(res.token);
        setTokenSnapshot(res.token);
        setUser(res.user);
      } catch (e) {
        setUser(null);
        clearAuthToken();
        setTokenSnapshot(null);
        setError(e instanceof Error ? e.message : 'Login failed');
        throw e;
      } finally {
        setPendingMagicLink(false);
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    const supabase = getSupabaseClient();
    if (supabase) {
      void supabase.auth.signOut();
    }
    clearAuthToken();
    setTokenSnapshot(null);
    setUser(null);
    setError(null);
    setPendingMagicLink(false);
  }, []);

  return useMemo(
    () => ({
      user,
      isAdmin,
      hasToken,
      loading,
      error,
      pendingMagicLink,
      magicLinkSentTo,
      refresh,
      login,
      logout,
    }),
    [
      user,
      isAdmin,
      hasToken,
      loading,
      error,
      pendingMagicLink,
      magicLinkSentTo,
      refresh,
      login,
      logout,
    ]
  );
}
