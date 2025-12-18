import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export const RequireAdmin: React.FC<{
  title?: string;
  children: React.ReactNode;
}> = ({ title = 'Admin Access', children }) => {
  const { user, isAdmin, loading, error, login, logout, hasToken } = useAuth();
  const [identifier, setIdentifier] = useState<string>('admin');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const combinedError = localError ?? error;

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await login({ identifier: identifier.trim(), password });
      setPassword('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm text-slate-400">Checking permissions…</div>
      </div>
    );
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">{title}</h1>
        <div className="text-sm text-slate-400 mb-4">
          {user
            ? `Signed in as ${user.identifier} (${user.role}). Admin role is required.`
            : hasToken
              ? 'Your session is not authorized for admin tools.'
              : 'Sign in to access admin tools.'}
        </div>

        {combinedError && (
          <div className="mb-4 p-3 rounded-md border border-red-800 bg-red-950/30 text-red-200 text-sm">
            {combinedError}
          </div>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
          <label className="block">
            <div className="text-xs text-slate-400 mb-1">Identifier</div>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <div className="text-xs text-slate-400 mb-1">Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm"
              autoComplete="current-password"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || identifier.trim().length === 0 || password.length === 0}
              className="px-4 py-2 rounded-md bg-sky-700 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-300 text-sm font-medium transition-colors"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            {hasToken && (
              <button
                type="button"
                onClick={logout}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm"
              >
                Sign out
              </button>
            )}
            <a href="/" className="ml-auto text-sm text-slate-400 hover:text-slate-200">
              Back
            </a>
          </div>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          This is local auth only. Supabase integration will replace this later.
        </div>
      </div>
    </div>
  );
};
