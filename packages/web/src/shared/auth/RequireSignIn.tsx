import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { getSupabaseClient } from '../supabase/client.js';

export const RequireSignIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, error, login, pendingMagicLink, logout, hasToken, magicLinkSentTo } =
    useAuth();
  const supabaseConfigured = Boolean(getSupabaseClient());
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim() });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const combinedError = localError ?? error;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Sign in</h1>
        <div className="text-sm text-slate-400 mb-4">
          {hasToken
            ? 'Your session is not authorized yet.'
            : supabaseConfigured
              ? 'Enter your email to receive a magic link.'
              : 'Supabase is not configured for this build.'}
        </div>

        {combinedError && (
          <div className="mb-4 p-3 rounded-md border border-red-800 bg-red-950/30 text-red-200 text-sm">
            {combinedError}
          </div>
        )}

        {!combinedError && magicLinkSentTo && (
          <div className="mb-4 p-3 rounded-md border border-emerald-800 bg-emerald-950/30 text-emerald-200 text-sm">
            Magic link requested for <span className="font-medium">{magicLinkSentTo}</span>. Check
            spam/promotions.
          </div>
        )}

        {supabaseConfigured ? (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            <label className="block">
              <div className="text-xs text-slate-400 mb-1">Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting || pendingMagicLink || email.trim().length === 0}
                className="px-4 py-2 rounded-md bg-violet-700 hover:bg-violet-600 disabled:bg-slate-700 disabled:text-slate-300 text-sm font-medium transition-colors"
              >
                {submitting || pendingMagicLink ? 'Sending link…' : 'Send magic link'}
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
            </div>

            <div className="mt-3 text-xs text-slate-500">
              After clicking the email link, reload the page if it does not update automatically.
            </div>
          </form>
        ) : (
          <div className="text-sm text-slate-400">No sign-in available.</div>
        )}
      </div>
    </div>
  );
};
