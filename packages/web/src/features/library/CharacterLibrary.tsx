import React from 'react';
import type { CharacterSummary } from '../../types.js';

interface CharacterLibraryProps {
  characters: CharacterSummary[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEdit: (id: string) => void;
  onCreateNew: () => void;
}

export const CharacterLibrary: React.FC<CharacterLibraryProps> = ({
  characters,
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
          <h1 className="text-2xl font-semibold text-slate-100">Characters</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your character profiles</p>
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
            + New Character
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading characters…</div>}

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

      {!loading && !error && characters.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
          <p className="text-slate-400 mb-4">No characters yet</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500"
          >
            Create your first character
          </button>
        </div>
      )}

      {!loading && !error && characters.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <button
              key={character.id}
              onClick={() => onEdit(character.id)}
              className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/70 hover:border-violet-600/50 transition-all group"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-slate-100 group-hover:text-violet-300 transition-colors">
                  {character.name}
                </h3>
                {character.source && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                    {character.source}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-2 line-clamp-2">{character.summary}</p>
              {character.tags && character.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {character.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                  {character.tags.length > 3 && (
                    <span className="text-xs text-slate-500">+{character.tags.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
