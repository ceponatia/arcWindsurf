import React from 'react';
import type { ItemSummary } from '../../types.js';

interface ItemLibraryProps {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEdit: (id: string) => void;
  onCreateNew: () => void;
}

export const ItemLibrary: React.FC<ItemLibraryProps> = ({
  items,
  loading,
  error,
  onRefresh,
  onEdit,
  onCreateNew,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Items</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your item definitions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={onCreateNew}
            className="px-3 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            + New Item
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading items…</div>}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
          <p className="text-slate-400 mb-4">No items yet</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500"
          >
            Create your first item
          </button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onEdit(item.id)}
              className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/70 hover:border-violet-600/50 transition-all group"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-slate-100 group-hover:text-violet-300 transition-colors">
                  {item.name}
                </h3>
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 capitalize">
                  {item.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{item.type}</p>
              {item.description && (
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">{item.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
