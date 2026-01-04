import React from 'react';

export interface AppHeaderProps {
  characterName?: string | undefined;
  settingName?: string | undefined;
  hasSession?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ characterName, settingName, hasSession }) => {
  const showInfo = hasSession && characterName && settingName;

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
            <span className="header-character">{characterName}</span>
            <span className="header-sep">·</span>
            <span className="header-setting">{settingName}</span>
          </div>
        ) : (
          <span className="muted">No session selected</span>
        )}
      </div>
    </header>
  );
};
