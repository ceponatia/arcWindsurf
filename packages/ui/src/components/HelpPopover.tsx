import React, { useState, useRef, useEffect } from 'react';

export interface HelpPopoverProps {
  /** Title of the help section */
  title: string;
  /** Content to display (can be JSX) */
  children: React.ReactNode;
  /** Optional link to full documentation */
  docLink?: string;
  /** Trigger element (defaults to help icon button) */
  trigger?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Popover component for more detailed contextual help.
 * Click to open, shows a larger help panel with optional link to full docs.
 */
export const HelpPopover: React.FC<HelpPopoverProps> = ({
  title,
  children,
  docLink,
  trigger,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const defaultTrigger = (
    <button
      type="button"
      className="w-5 h-5 rounded-full border border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 hover:border-slate-500 transition-colors inline-flex items-center justify-center"
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
  );

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger ?? defaultTrigger}</div>

      {isOpen && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 max-w-sm bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-3 text-sm text-slate-300 space-y-2 max-h-64 overflow-y-auto">
            {children}
          </div>

          {docLink && (
            <div className="px-4 py-2 border-t border-slate-700">
              <a
                href={`#/${docLink}`}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                onClick={() => setIsOpen(false)}
              >
                Read full documentation
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
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </a>
            </div>
          )}

          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  );
};
