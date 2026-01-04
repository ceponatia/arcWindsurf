import React, { useState } from 'react';

export interface HelpIconProps {
  /** Brief tooltip text for quick help */
  tooltip: string;
  /** Optional link to full documentation (hash route like "docs/character-builder") */
  docLink?: string;
  /** Size of the icon */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Help icon that shows a tooltip on hover and optionally links to full documentation.
 * Used for contextual help throughout the application.
 */
export const HelpIcon: React.FC<HelpIconProps> = ({
  tooltip,
  docLink,
  size = 'sm',
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
  };

  const handleClick = (e: React.MouseEvent) => {
    if (docLink) {
      window.location.hash = `#/${docLink}`;
    } else {
      e.preventDefault();
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        className={`${sizeClasses[size]} rounded-full border border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 hover:border-slate-500 transition-colors inline-flex items-center justify-center ${docLink ? 'cursor-pointer' : 'cursor-help'}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={handleClick}
        aria-label="Help"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-3 h-3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          />
        </svg>
      </button>

      {showTooltip && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 px-3 py-2 text-xs text-slate-200 bg-slate-900 border border-slate-700 rounded-lg shadow-xl pointer-events-none">
          <div className="whitespace-normal">{tooltip}</div>
          {docLink && <div className="mt-1 text-blue-400 font-medium">Click to learn more →</div>}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  );
};
