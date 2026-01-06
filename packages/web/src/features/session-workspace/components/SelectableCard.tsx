import React from 'react';

interface SelectableCardProps {
  title: string;
  subtitle?: string | undefined;
  description?: string | undefined;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const SelectableCard: React.FC<SelectableCardProps> = ({
  title,
  subtitle,
  description,
  selected,
  onClick,
  icon,
  actions,
  badges,
  className = '',
  children,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-lg border transition-all cursor-pointer
        ${
          selected
            ? 'border-violet-500 bg-violet-950/40 ring-1 ring-violet-500/50'
            : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
        }
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {icon && (
            <div
              className={`p-2 rounded-lg ${selected ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-700/50 text-slate-400'}`}
            >
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className={`font-medium truncate ${selected ? 'text-violet-100' : 'text-slate-200'}`}
              >
                {title}
              </h3>
              {badges}
            </div>
            {subtitle && <p className="text-xs text-slate-500 font-medium mb-1">{subtitle}</p>}
            {description && <p className="text-sm text-slate-400 line-clamp-2">{description}</p>}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => { e.stopPropagation(); }}>
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div
          className="mt-3 pt-3 border-t border-slate-700/50 cursor-default"
          onClick={(e) => { e.stopPropagation(); }}
        >
          {children}
        </div>
      )}
    </div>
  );
};
