import React from 'react';
import type { MobileHeaderProps } from '../../../types.js';

const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onMenuToggle,
  characterName,
  settingName,
  hasSession,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center gap-3">
      <button
        onClick={onMenuToggle}
        className="p-2 -ml-2 rounded-md hover:bg-slate-800 active:bg-slate-700 transition-colors"
        aria-label="Toggle menu"
      >
        <MenuIcon className="text-slate-300" />
      </button>

      <div className="flex-1 min-w-0">
        {hasSession ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200 truncate">
              {characterName ?? 'Unknown Character'}
            </span>
            <span className="text-xs text-slate-400 truncate">
              {settingName ?? 'Unknown Setting'}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">No active session</span>
        )}
      </div>

      {hasSession && (
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Session active" />
      )}
    </header>
  );
};
