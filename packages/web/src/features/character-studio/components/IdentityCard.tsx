import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface IdentityCardProps {
  title: string;
  defaultOpen?: boolean;
  completionPercent?: number; // 0-100, optional
  hasContent?: boolean | undefined;
  children: React.ReactNode;
}

/**
 * A reusable collapsible card component for the Character Studio identity panels.
 */
export const IdentityCard: React.FC<IdentityCardProps> = ({
  title,
  defaultOpen = false,
  completionPercent,
  hasContent,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900/20 shadow-sm transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
          isOpen ? 'bg-slate-800/80' : 'bg-slate-800/40 hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200 text-sm tracking-wide">{title}</span>
            {hasContent && !isOpen && (
              <Check
                size={14}
                className="text-emerald-500 animate-in fade-in zoom-in duration-300"
              />
            )}
          </div>
          {completionPercent !== undefined && (
            <div className="flex items-center gap-2 flex-1 max-w-[100px]" aria-hidden="true">
              <div className="h-1 flex-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                {Math.round(completionPercent)}%
              </span>
            </div>
          )}
        </div>
        <div className="text-slate-500 ml-2">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100 max-h-[5000px] visible' : 'opacity-0 max-h-0 invisible'
        } overflow-hidden`}
      >
        <div className="p-4 bg-slate-900/10">{children}</div>
      </div>
    </div>
  );
};
