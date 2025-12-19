import { useCallback, useEffect, useMemo, useState } from 'react';
import { authLogin, authMe } from '../api/client.js';
import type { AuthUser } from '../auth/types.js';
import { clearAuthToken, getAuthToken, setAuthToken } from '../auth/token.js';
import { getSupabaseClient } from '../supabase/client.js';

function getRedirectUrlForMagicLink(): string {
  try {
    const u = new URL(globalThis.location?.href ?? '');
    u.hash = '';
    u.search = '';
    return u.toString();
  } catch {
    return globalThis.location?.origin ?? '';
  }
}

export interface UseAuthState {
  user: AuthUser | null;
  isAdmin: boolean;
  hasToken: boolean;
  loading: boolean;
  error: string | null;
  pendingMagicLink: boolean;
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

  const hasToken = Boolean(tokenSnapshot);
  const isAdmin = user?.role === 'admin';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token ?? null;
        if (!token) {
          setUser(null);
          setTokenSnapshot(null);
          return;
        }
        // Mirror into local storage so any non-supabase paths still work.
        setAuthToken(token);
        setTokenSnapshot(token);
      }

      const res = await authMe();
      setUser(res.user);
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
  }, [refresh, tokenSnapshot]);

  const login = useCallback(
    async (params: { email: string } | { identifier: string; password: string }) => {
      setLoading(true);
      setError(null);
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
      refresh,
      login,
      logout,
    }),
    [user, isAdmin, hasToken, loading, error, pendingMagicLink, refresh, login, logout]
  );
}
