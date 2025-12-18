import React, { useEffect, useRef, useState } from 'react';
import { getTags } from '../../shared/api/client.js';
import type { TagSummary } from '../../types.js';

interface TagLibraryProps {
  onEdit: (id: string) => void;
  onCreateNew: () => void;
}

export const TagLibrary: React.FC<TagLibraryProps> = ({ onEdit, onCreateNew }) => {
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadTags = () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    getTags(ctrl.signal)
      .then((data) => {
        setTags(
          data.map((t) => ({
            id: t.id,
            name: t.name,
            shortDescription: t.shortDescription ?? null,
            promptText: t.promptText,
            targetType: t.targetType ?? 'session',
          }))
        );
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setError((e as Error).message || 'Failed to load tags');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTags();
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Prompt Tags</h1>
          <p className="text-sm text-slate-400 mt-1">Reusable prompt modifiers for sessions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTags}
            className="px-3 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={onCreateNew}
            className="px-3 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            + New Tag
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading tags…</div>}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadTags}
            className="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && tags.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
          <p className="text-slate-400 mb-4">No tags yet</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500"
          >
            Create your first tag
          </button>
        </div>
      )}

      {!loading && !error && tags.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onEdit(tag.id)}
              className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/70 hover:border-violet-600/50 transition-all group"
            >
              <h3 className="font-medium text-slate-100 group-hover:text-violet-300 transition-colors">
                {tag.name}
              </h3>
              {tag.shortDescription && (
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">{tag.shortDescription}</p>
              )}
              <p className="text-xs text-slate-500 mt-2 line-clamp-2 font-mono">
                {tag.promptText.slice(0, 80)}
                {tag.promptText.length > 80 ? '…' : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
