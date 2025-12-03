import React, { useEffect, useState } from 'react';
import { getTags } from '../../shared/api/client.js';
import type { TagSummary } from '../../types.js';

export interface TagsPanelProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  onEdit: () => void;
}

export const TagsPanel: React.FC<TagsPanelProps> = ({ selectedIds, onToggle, onEdit }) => {
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await getTags();
      setTags(
        data.map((tag) => ({
          id: tag.id,
          name: tag.name,
          shortDescription: tag.shortDescription ?? null,
          promptText: tag.promptText,
        }))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
  }, []);

  return (
    <section className="border border-slate-800 rounded-lg overflow-hidden">
      <h2 className="px-3 py-2 border-b border-slate-800 bg-slate-900/60 text-sm font-semibold flex justify-between items-center">
        <span>Prompt Tags</span>
        <button onClick={onEdit} className="text-xs text-violet-400 hover:text-violet-300">
          Manage
        </button>
      </h2>
      <div className="p-3">
        {loading && <p className="text-slate-400">Loading…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && (
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li key={tag.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`tag-${tag.id}`}
                  checked={selectedIds.includes(tag.id)}
                  onChange={() => onToggle(tag.id)}
                  className="rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500"
                />
                <label
                  htmlFor={`tag-${tag.id}`}
                  className="text-sm text-slate-200 cursor-pointer select-none"
                >
                  {tag.name}
                </label>
              </li>
            ))}
            {tags.length === 0 && <li className="text-slate-400 text-sm">No tags available.</li>}
          </ul>
        )}
      </div>
    </section>
  );
};
