import React, { useMemo, useState } from 'react';
import type { TurnDebugSlice } from '../../types.js';

const variantClasses: Record<TurnDebugSlice['variant'], { container: string; heading: string }> = {
  intent: {
    container: 'border-l-4 border-emerald-400/70 bg-emerald-950/30',
    heading: 'text-emerald-200',
  },
  prompt: {
    container: 'border-l-4 border-sky-400/70 bg-sky-950/20',
    heading: 'text-sky-200',
  },
  raw: {
    container: 'border-l-4 border-amber-400/70 bg-amber-950/20',
    heading: 'text-amber-200',
  },
  agent: {
    container: 'border-l-4 border-violet-400/70 bg-violet-950/30',
    heading: 'text-violet-200',
  },
};

export interface TurnDebugBubbleProps {
  slice: TurnDebugSlice;
}

export const TurnDebugBubble: React.FC<TurnDebugBubbleProps> = ({ slice }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);
  const jsonBody = slice.body.kind === 'json' ? slice.body : null;
  const isJson = Boolean(jsonBody);

  const variant = variantClasses[slice.variant];

  const collapseLabel = collapsed ? 'Expand' : 'Collapse';

  const handleCopy = useMemo(() => {
    if (!jsonBody) return undefined;
    return () => {
      void navigator.clipboard
        .writeText(jsonBody.value)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.warn('Copy failed', err);
        });
    };
  }, [jsonBody]);

  return (
    <div
      className={`rounded-lg border border-slate-800/60 shadow-sm px-3 py-3 text-sm text-slate-100 ${variant.container}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${variant.heading}`}>
            {slice.title}
          </p>
          {slice.description && (
            <p className="text-xs text-slate-400 mt-0.5">{slice.description}</p>
          )}
        </div>
        {isJson && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <button
              type="button"
              className="hover:text-slate-200"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapseLabel}
            </button>
            <button
              type="button"
              className="hover:text-slate-200"
              onClick={handleCopy}
              disabled={!handleCopy}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 text-slate-100">
        {slice.body.kind === 'text' && (
          <div className="space-y-1">
            {slice.body.lines.map((line, idx) => (
              <p key={idx} className="text-sm text-slate-100 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        )}
        {slice.body.kind === 'list' && (
          <div>
            {slice.body.title && (
              <p className="text-xs text-slate-300 uppercase tracking-wide mb-1">
                {slice.body.title}
              </p>
            )}
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {slice.body.items.map((item, idx) => (
                <li key={idx} className="text-slate-100">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {slice.body.kind === 'code' && (
          <div>
            {slice.body.label && (
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                {slice.body.label}
              </p>
            )}
            <pre className="bg-slate-900/70 rounded-lg p-3 text-[13px] font-mono overflow-x-auto">
              {slice.body.value}
            </pre>
          </div>
        )}
        {isJson && (
          <div>
            {jsonBody?.label && (
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                {jsonBody.label}
              </p>
            )}
            {collapsed ? (
              <p className="text-xs italic text-slate-400">Hidden — expand to inspect JSON.</p>
            ) : (
              <pre className="bg-slate-900/70 rounded-lg p-3 text-[13px] font-mono overflow-x-auto">
                {jsonBody?.value}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
