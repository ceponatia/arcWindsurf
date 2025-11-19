import React from 'react';
import { useCharacters } from '../hooks/useCharacters.js';
import { deleteCharacter } from '../api/client.js';

export interface CharactersPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = ({ selectedId, onSelect }) => {
  const { loading, error, data, retry } = useCharacters();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this character?')) return;
    try {
      await deleteCharacter(id);
      if (selectedId === id) onSelect(null);
      retry();
    } catch (err) {
      console.error('Failed to delete character', err);
      alert('Failed to delete character');
    }
  };

  return (
    <section className="border border-slate-800 rounded-lg overflow-hidden">
      <h2 className="px-3 py-2 border-b border-slate-800 bg-slate-900/60 text-sm font-semibold">
        Characters
      </h2>
      <div className="p-3">
        {loading && <p className="text-slate-400">Loading…</p>}
        {error && (
          <div className="space-y-2">
            <p className="text-red-400">Failed to load: {error}</p>
            <button className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-200" onClick={retry}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && (
          <ul className="space-y-2">
            {(data ?? []).map((c) => (
              <li
                key={c.id}
                className={`group flex flex-col p-3 rounded-lg hover:bg-slate-800 border ${
                  selectedId === c.id
                    ? 'border-violet-700'
                    : 'border-transparent hover:border-slate-700'
                } cursor-pointer`}
                onClick={() => onSelect(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelect(c.id);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="text-sm font-medium text-slate-200">{c.name}</div>
                  <button
                    onClick={(e) => {
                      void handleDelete(e, c.id);
                    }}
                    className="text-slate-500 hover:text-red-400 p-1 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete character"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                <div className="text-xs text-slate-400">{c.summary}</div>
                {c.tags && c.tags.length > 0 && (
                  <div className="mt-1 text-[11px] text-slate-500">{c.tags.join(', ')}</div>
                )}
              </li>
            ))}
            {(data ?? []).length === 0 && (
              <li className="text-slate-400">No characters available.</li>
            )}
            <li className="">
              <a
                className="text-violet-400 hover:text-violet-300 text-sm"
                href="#/character-builder"
              >
                Character Builder
              </a>
            </li>
          </ul>
        )}
      </div>
    </section>
  );
};
