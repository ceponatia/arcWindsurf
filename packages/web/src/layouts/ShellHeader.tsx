import React from 'react';

interface ShellHeaderProps {
  onMenuClick: () => void;
  onLogoClick: () => void;
}

/**
 * Universal header component for the application.
 * Responsively hides/shows menu toggles based on viewport.
 */
export const ShellHeader: React.FC<ShellHeaderProps> = ({ onMenuClick, onLogoClick }) => {
  return (
    <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
      <button
        onClick={onLogoClick}
        className="text-lg font-semibold text-slate-100 hover:text-violet-400 transition-colors"
      >
        ArcAgentic
      </button>

      {/* Mobile menu toggle button */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-md text-slate-300 hover:bg-slate-800 md:hidden"
        aria-label="Open menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6"
        >
          <path
            fillRule="evenodd"
            d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Desktop could have additional items here in the future */}
      <div className="hidden md:block">{/* Placeholder for desktop-specific header items */}</div>
    </header>
  );
};
