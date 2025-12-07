import { useCallback, useEffect, useState } from 'react';

import { getTags } from '../../shared/api/client.js';

interface TagItem {
  id: string;
  name: string;
  shortDescription: string | null;
  category: string;
  activationMode: string;
}

export interface TagsPanelProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  onEdit: (id?: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  style: 'bg-purple-600/30 text-purple-300',
  mechanic: 'bg-blue-600/30 text-blue-300',
  content: 'bg-green-600/30 text-green-300',
  world: 'bg-amber-600/30 text-amber-300',
  behavior: 'bg-pink-600/30 text-pink-300',
  trigger: 'bg-orange-600/30 text-orange-300',
  meta: 'bg-gray-600/30 text-gray-300',
};

export const TagsPanel: React.FC<TagsPanelProps> = ({ selectedIds, onToggle, onEdit }) => {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTags();
      setTags(
        data.map((tag) => ({
          id: tag.id,
          name: tag.name,
          shortDescription: tag.shortDescription ?? null,
          category: (tag as unknown as { category?: string }).category ?? 'style',
          activationMode:
            (tag as unknown as { activationMode?: string }).activationMode ?? 'always',
        }))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const handleEditClick = useCallback(
    (id?: string) => {
      onEdit(id);
    },
    [onEdit]
  );

  return (
    <section className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/30">
      <div className="px-3 py-2 border-b border-gray-700 bg-gray-900/60 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-white">Prompt Tags</h2>
        <button
          onClick={() => handleEditClick()}
          className="text-xs px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded transition-colors"
        >
          + New Tag
        </button>
      </div>

      <div className="p-3 max-h-80 overflow-y-auto">
        {loading && <p className="text-gray-400 text-sm">Loading…</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {!loading && !error && (
          <div className="space-y-2">
            {tags.map((tag) => (
              <TagCard
                key={tag.id}
                tag={tag}
                isSelected={selectedIds.includes(tag.id)}
                onToggle={() => onToggle(tag.id)}
                onEdit={() => handleEditClick(tag.id)}
              />
            ))}
            {tags.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                No tags available. Create one to get started.
              </p>
            )}
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-700 bg-gray-900/40">
          <p className="text-xs text-gray-400">
            {selectedIds.length} tag{selectedIds.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </section>
  );
};

interface TagCardProps {
  tag: TagItem;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

function TagCard({ tag, isSelected, onToggle, onEdit }: TagCardProps) {
  const categoryColor = CATEGORY_COLORS[tag.category] ?? 'bg-purple-600/30 text-purple-300';

  return (
    <div
      className={`p-2 rounded border transition-colors ${
        isSelected
          ? 'bg-blue-900/20 border-blue-600/50'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id={`tag-${tag.id}`}
          checked={isSelected}
          onChange={onToggle}
          className="mt-1 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`tag-${tag.id}`}
              className="text-sm font-medium text-white cursor-pointer truncate"
            >
              {tag.name}
            </label>
            <span className={`px-1.5 py-0.5 text-xs rounded ${categoryColor}`}>{tag.category}</span>
            {tag.activationMode === 'conditional' && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-600/20 text-amber-300 rounded">
                ⚡
              </span>
            )}
          </div>

          {tag.shortDescription && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tag.shortDescription}</p>
          )}
        </div>

        <button
          onClick={onEdit}
          className="text-xs text-gray-400 hover:text-white transition-colors p-1"
          aria-label={`Edit ${tag.name}`}
        >
          ✏️
        </button>
      </div>
    </div>
  );
}
