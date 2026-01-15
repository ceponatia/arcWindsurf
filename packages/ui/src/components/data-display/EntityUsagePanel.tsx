import React from 'react';
import type { EntityUsagePanelProps } from './types.js';

/**
 * Shared component for displaying "Where is this used?" information.
 * Shows a list of sessions that reference an entity.
 */
export const EntityUsagePanel: React.FC<EntityUsagePanelProps> = ({
  entityType,
  sessions,
  totalCount,
  loading = false,
  error = null,
  onSessionClick,
  maxDisplay = 5,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [showAll, setShowAll] = React.useState(false);

  const displayedSessions = showAll ? sessions : sessions.slice(0, maxDisplay);
  const hasMore = sessions.length > maxDisplay;

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const entityTypeLabel = (() => {
    switch (entityType) {
      case 'character':
        return 'Character';
      case 'setting':
        return 'Setting';
      case 'persona':
        return 'Persona';
      case 'location':
        return 'Location';
      default:
        return 'Entity';
    }
  })();

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-750 transition-colors"
        disabled={!onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">Where is this used?</span>
          {totalCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-violet-600/30 text-violet-300 rounded-full">
              {totalCount} session{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {onToggleCollapse && (
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-4 pb-4">
          {loading && (
            <div className="py-4 text-center text-slate-400 text-sm">Loading usage data...</div>
          )}

          {error && <div className="py-4 text-center text-red-400 text-sm">{error}</div>}

          {!loading && !error && totalCount === 0 && (
            <div className="py-4 text-center text-slate-500 text-sm">
              This {entityTypeLabel.toLowerCase()} is not used in any sessions yet.
            </div>
          )}

          {!loading && !error && totalCount > 0 && (
            <div className="space-y-2">
              {displayedSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`
                    flex items-center justify-between p-2 rounded
                    bg-slate-700/50 hover:bg-slate-700
                    ${onSessionClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => onSessionClick?.(session.sessionId)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-200 font-mono truncate block">
                      {session.sessionId.slice(0, 8)}...
                    </span>
                    {session.role && (
                      <span className="text-xs text-slate-400 capitalize">
                        Role: {session.role}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 ml-2 shrink-0">
                    {formatDate(session.createdAt)}
                  </span>
                </div>
              ))}

              {hasMore && !showAll && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAll(true);
                  }}
                  className="w-full py-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Show {sessions.length - maxDisplay} more...
                </button>
              )}

              {showAll && hasMore && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAll(false);
                  }}
                  className="w-full py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
