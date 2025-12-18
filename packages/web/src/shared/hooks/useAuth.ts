import { useCallback, useEffect, useMemo, useState } from 'react';
import { authLogin, authMe } from '../api/client.js';
import type { AuthUser } from '../auth/types.js';
import { clearAuthToken, getAuthToken, setAuthToken } from '../auth/token.js';

export interface UseAuthState {
  user: AuthUser | null;
  isAdmin: boolean;
  hasToken: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  login: (params: { identifier: string; password: string }) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenSnapshot, setTokenSnapshot] = useState<string | null>(() => getAuthToken());

  const hasToken = Boolean(tokenSnapshot);
  const isAdmin = user?.role === 'admin';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

  const login = useCallback(async (params: { identifier: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authLogin(params);
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
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setTokenSnapshot(null);
    setUser(null);
    setError(null);
  }, []);

  return useMemo(
    () => ({
      user,
      isAdmin,
      hasToken,
      loading,
      error,
      refresh,
      login,
      logout,
    }),
    [user, isAdmin, hasToken, loading, error, refresh, login, logout]
  );
}
