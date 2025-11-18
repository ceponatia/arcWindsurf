import React from 'react';
import { useCharacters } from '../hooks/useCharacters.js';

export interface CharactersPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = ({ selectedId, onSelect }) => {
  const { loading, error, data, retry } = useCharacters();

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
                <div className="text-sm font-medium text-slate-200">{c.name}</div>
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
