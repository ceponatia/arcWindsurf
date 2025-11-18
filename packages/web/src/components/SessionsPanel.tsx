import React from 'react';
import type { SessionSummary } from '../types.js';

const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 6h18" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export interface SessionsPanelProps {
  sessions: SessionSummary[];
  loading?: boolean;
  error?: string | null;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onRetry?: () => void;
  onDelete?: (id: string) => void;
}

export const SessionsPanel: React.FC<SessionsPanelProps> = ({
  sessions,
  loading = false,
  error = null,
  activeId,
  onSelect,
  onRetry,
  onDelete,
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
                  className={`group relative flex flex-col p-3 rounded-lg hover:bg-slate-800 border ${
                    isActive ? 'border-emerald-700' : 'border-transparent hover:border-slate-700'
                  } cursor-pointer`}
                  onClick={() => onSelect?.(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelect?.(s.id);
                  }}
                >
                  <div className="text-sm font-medium text-slate-200 pr-6">{characterLabel}</div>
                  <div className="text-xs text-slate-400">{settingLabel}</div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(s.createdAt).toLocaleTimeString()}
                  </div>
                  {onDelete && (
                    <button
                      className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(s.id);
                      }}
                      title="Delete session"
                    >
                      <TrashIcon size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
