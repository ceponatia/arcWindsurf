import React, { useMemo, useState } from 'react';
import { getToolingFailures } from '../../shared/api/client.js';
import type { ToolingFailuresResponseDto } from './types.js';
import { RequireAdmin } from '../../shared/auth/RequireAdmin.js';

function formatMaybeJson(v: unknown): string {
  try {
    if (v && typeof v === 'object') return JSON.stringify(v, null, 2);
    if (typeof v === 'string') return v;
    return String(v);
  } catch {
    return String(v);
  }
}

const Header: React.FC = () => (
  <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
    <h1 className="text-lg font-semibold text-slate-100 m-0">Tooling Failures</h1>
    <a
      href="#/"
      className="px-3 py-1.5 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm font-medium"
    >
      ← Back to App
    </a>
  </header>
);

export const ToolingFailuresView: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [limit, setLimit] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ToolingFailuresResponseDto | null>(null);

  // NOTE: Some tooling/linters can temporarily treat newly-added API client exports as "error"-typed.
  // Wrap it into a locally-typed function to keep the view code safe and explicit.
  const fetchToolingFailures = getToolingFailures as unknown as (
    sessionId: string,
    limit: number
  ) => Promise<ToolingFailuresResponseDto>;

  const disabledReason = useMemo(() => null, []);

  async function onFetch(): Promise<void> {
    if (disabledReason) return;

    const trimmed = sessionId.trim();
    if (!trimmed) {
      setError('Session ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchToolingFailures(trimmed, limit);
      setData(res);
    } catch (e) {
      setError((e as Error).message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAdmin title="Tooling Failures">
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Header />

        <div className="p-4 max-w-5xl mx-auto">
          <div className="mb-4 p-4 rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block sm:col-span-2">
                <div className="text-xs text-slate-400 mb-1">Session ID</div>
                <input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="e.g. 0d5b..."
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm"
                />
              </label>

              <label className="block">
                <div className="text-xs text-slate-400 mb-1">Limit</div>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => void onFetch()}
                disabled={loading || Boolean(disabledReason)}
                className="px-4 py-2 rounded-md bg-sky-700 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-300 text-sm font-medium transition-colors"
              >
                {loading ? 'Loading…' : 'Fetch'}
              </button>
              <div className="text-xs text-slate-500">
                Endpoint:{' '}
                <span className="text-slate-400">/admin/sessions/:id/tooling-failures</span>
              </div>
            </div>

            {error && (
              <div className="mt-3 text-sm text-red-300 bg-red-950/30 border border-red-800 rounded-md p-2">
                {error}
              </div>
            )}
          </div>

          {data && (
            <div className="space-y-3">
              <div className="text-sm text-slate-300">
                Found <span className="font-semibold">{data.count}</span> turn(s) with tooling
                failures.
              </div>

              {data.failures.map((f) => (
                <div
                  key={`${f.turnIdx}-${f.createdAt}`}
                  className="rounded-lg border border-slate-800 bg-slate-900/30"
                >
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Turn {f.turnIdx}</div>
                      <div className="text-xs text-slate-500">{f.createdAt}</div>
                    </div>
                    <div className="text-xs text-slate-500">{f.events.length} event(s)</div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Player Input</div>
                      <div className="text-sm text-slate-200 whitespace-pre-wrap">
                        {f.playerInput}
                      </div>
                    </div>

                    {f.events.map((e, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-slate-800 bg-slate-950/30 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-slate-400">
                            tooling-failure {e.timestamp ? `• ${e.timestamp}` : ''}
                            {e.source ? ` • ${e.source}` : ''}
                          </div>
                        </div>
                        <pre className="text-xs text-slate-200 whitespace-pre-wrap overflow-x-auto">
                          {formatMaybeJson(e.payload)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAdmin>
  );
};

export default ToolingFailuresView;
