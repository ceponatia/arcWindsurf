import React from 'react';
import type { SessionSummary } from '../../types.js';

interface SessionLibraryProps {
  sessions: SessionSummary[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  activeSessionId: string | null;
}

export const SessionLibrary: React.FC<SessionLibraryProps> = ({
  sessions,
  loading,
  error,
  onRefresh,
  onSelect,
  onDelete,
  onCreateNew,
  activeSessionId,
}) => {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Sessions</h1>
          <p className="text-sm text-slate-400 mt-1">Your conversation history</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={onCreateNew}
            className="px-3 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            + New Session
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading sessions…</div>}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
          <p className="text-slate-400 mb-4">No sessions yet</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500"
          >
            Start your first session
          </button>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 rounded-lg border transition-all ${
                session.id === activeSessionId
                  ? 'border-violet-600 bg-violet-950/30'
                  : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <button onClick={() => onSelect(session.id)} className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-100">
                      {session.characterName ?? session.playerCharacterId ?? 'Unknown Hero'}
                    </h3>
                    <span className="text-slate-600">×</span>
                    <span className="text-slate-300">
                      {session.settingName ?? session.settingId ?? 'Unknown World'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(
                      typeof session.createdAt === 'string'
                        ? session.createdAt
                        : session.createdAt.toISOString()
                    )}
                  </p>
                  {session.id === activeSessionId && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-violet-600/20 text-violet-300">
                      Active
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onDelete(session.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                  title="Delete session"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
