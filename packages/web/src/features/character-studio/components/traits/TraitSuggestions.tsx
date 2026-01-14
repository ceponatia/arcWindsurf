import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { pendingTraits, acceptTrait, rejectTrait } from '../../signals.js';

export const TraitSuggestions: React.FC = () => {
  useSignals();

  const pending = pendingTraits.value.filter((t) => t.status === 'pending');

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-800 bg-slate-900/30 p-4">
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
        Detected Traits
      </h4>

      <div className="space-y-2">
        {pending.map((trait) => (
          <div
            key={`${trait.path}:${trait.evidence}:${Math.round(trait.confidence * 1000)}`}
            className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-200 font-medium">
                {formatTraitPath(trait.path)}
              </div>
              <div className="text-xs text-slate-400 truncate">"{trait.evidence}"</div>
              <div className="text-xs text-violet-400 mt-1">
                Confidence: {Math.round(trait.confidence * 100)}%
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => acceptTrait(trait.path)}
                className="px-3 py-1.5 text-xs bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => rejectTrait(trait.path)}
                className="px-3 py-1.5 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatTraitPath(path: string): string {
  const parts = path.split('.');
  const last = parts[parts.length - 1];
  return (
    last
      ?.replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim() ?? path
  );
}
