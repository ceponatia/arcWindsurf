import React from 'react';

export interface CharactersPanelCharacterSummary {
  id: string;
  name: string;
  summary: string;
  tags?: string[] | null;
}

export interface CharactersPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
  characters?: CharactersPanelCharacterSummary[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDeleteRequest?: (id: string) => void;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = ({
  selectedId,
  onSelect,
  onEdit,
  characters,
  loading,
  error,
  onRefresh,
  onDeleteRequest,
}) => {
  const data = characters;

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
            <button
              className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-200"
              onClick={onRefresh}
            >
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
                  <div className="flex flex-col items-end -mr-1 -mt-1">
                    {onDeleteRequest && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRequest(c.id);
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    )}
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(c.id);
                        }}
                        className="text-slate-500 hover:text-violet-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit character"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                      </button>
                    )}
                  </div>
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
            <li>
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
