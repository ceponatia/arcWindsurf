import React, { useMemo } from 'react';
import { useCharacters } from '../hooks/useCharacters.js';
import { useSettings } from '../hooks/useSettings.js';

export interface AppHeaderProps {
  characterId?: string | null;
  settingId?: string | null;
  hasSession?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ characterId, settingId, hasSession }) => {
  const { data: characters } = useCharacters();
  const { data: settings } = useSettings();

  const character = useMemo(
    () => characters?.find((c) => c.id === characterId),
    [characters, characterId]
  );
  const setting = useMemo(() => settings?.find((s) => s.id === settingId), [settings, settingId]);

  const showInfo = hasSession && character && setting;

  return (
    <header className="app-header">
      <div className="flex items-center gap-4">
        <h1 className="app-title">Minimal RPG</h1>
        <nav className="flex gap-3 text-sm">
          <a href="/dbview" className="text-slate-400 hover:text-slate-200 transition-colors">
            DB View
          </a>
        </nav>
      </div>
      <div className="app-actions">
        {showInfo ? (
          <div className="header-info">
            <span className="header-character">{character.name}</span>
            <span className="header-sep">·</span>
            <span className="header-setting">{setting.name}</span>
            <span className="tag" style={{ marginLeft: 8 }}>
              {setting.tone}
            </span>
          </div>
        ) : (
          <span className="muted">No session selected</span>
        )}
      </div>
    </header>
  );
};
