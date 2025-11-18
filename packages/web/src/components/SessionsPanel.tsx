import React from 'react';
import type { SessionSummary } from '../types.js';

export interface SessionsPanelProps {
  sessions: SessionSummary[];
  loading?: boolean;
  error?: string | null;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onRetry?: () => void;
}

export const SessionsPanel: React.FC<SessionsPanelProps> = ({
  sessions,
  loading = false,
  error = null,
  activeId,
  onSelect,
  onRetry,
}) => {
  const has = sessions.length > 0;
  return (
    <section className="border border-slate-800 rounded-lg overflow-hidden">
      <h2 className="px-3 py-2 border-b border-slate-800 bg-slate-900/60 text-sm font-semibold">
        Sessions
      </h2>
      <div className="p-3">
        {loading && <p className="text-slate-400">Loading…</p>}
        {!loading && error && (
          <div className="space-y-2">
            <p className="text-red-400">Failed to load: {error}</p>
            <button
              className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-200"
              onClick={onRetry}
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && !has && <p className="text-slate-400">No sessions yet.</p>}
        {!loading && !error && has && (
          <ul className="space-y-2">
            {sessions.map((s) => {
              const isActive = s.id === activeId;
              const characterLabel = s.characterName ?? s.characterId;
              const settingLabel = s.settingName ?? s.settingId;
              return (
                <li
                  key={s.id}
                  className={`group flex flex-col p-3 rounded-lg hover:bg-slate-800 border ${
                    isActive ? 'border-emerald-700' : 'border-transparent hover:border-slate-700'
                  } cursor-pointer`}
                  onClick={() => onSelect?.(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelect?.(s.id);
                  }}
                >
                  <div className="text-sm font-medium text-slate-200">{characterLabel}</div>
                  <div className="text-xs text-slate-400">{settingLabel}</div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(s.createdAt).toLocaleTimeString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
