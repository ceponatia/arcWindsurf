import React from 'react';
import { useCharacters } from '../hooks/useCharacters.js';

export interface CharactersPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = ({ selectedId, onSelect }) => {
  const { loading, error, data, retry } = useCharacters();

  return (
    <section className="panel panel-characters">
      <h2 className="panel-title">Characters</h2>
      <div className="panel-body">
        {loading && <p className="muted">Loading…</p>}
        {error && (
          <div>
            <p className="error">Failed to load: {error}</p>
            <button className="btn" onClick={retry}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && (
          <ul className="list">
            {(data ?? []).map((c) => (
              <li
                key={c.id}
                className={`list-item selectable${selectedId === c.id ? ' selected' : ''}`}
                onClick={() => onSelect(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelect(c.id);
                }}
              >
                <div className="item-title">{c.name}</div>
                <div className="item-summary">{c.summary}</div>
                {c.tags && c.tags.length > 0 && (
                  <div className="item-tags">{c.tags.join(', ')}</div>
                )}
              </li>
            ))}
            {(data ?? []).length === 0 && <li className="muted">No characters available.</li>}
          </ul>
        )}
      </div>
    </section>
  );
};
