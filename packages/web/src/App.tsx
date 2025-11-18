import React, { useState, useEffect } from 'react';
import { getErrorMessage } from '@minimal-rpg/utils';
import { AppHeader } from './components/AppHeader.js';
import { CharactersPanel } from './components/CharactersPanel.js';
import { SettingsSelector } from './components/SettingsSelector.js';
import { SessionsPanel } from './components/SessionsPanel.js';
import { ChatPanel } from './components/ChatPanel.js';
import { CharacterBuilder } from './components/CharacterBuilder.js';
import { createSession } from './api/client.js';
import { useSessions } from './hooks/useSessions.js';

export const App: React.FC = () => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);
  const {
    loading: sessionsLoading,
    error: sessionsError,
    data: sessionsData,
    refresh: refreshSessions,
  } = useSessions();
  const sessions = sessionsData ?? [];
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canStart = !!selectedCharacterId && !!selectedSettingId && !creating;

  const onStartSession = async () => {
    if (!selectedCharacterId || !selectedSettingId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await createSession(selectedCharacterId, selectedSettingId);
      setCurrentSessionId(res.id);
      refreshSessions();
    } catch (e: unknown) {
      const msg = getErrorMessage(e, 'Failed to create session');
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };
  const [hash, setHash] = useState<string>(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const showBuilder = hash === '#/character-builder';

  return (
    <div className="app-root">
      <aside className="sidebar">
        <CharactersPanel selectedId={selectedCharacterId} onSelect={setSelectedCharacterId} />
        <div className="spacer" />
        <SettingsSelector value={selectedSettingId} onChange={setSelectedSettingId} />
        <div className="spacer" />
        <div className="panel">
          <div className="panel-body">
            <button
              className={`btn primary${!canStart ? ' disabled' : ''}`}
              disabled={!canStart}
              onClick={() => {
                void onStartSession();
              }}
            >
              {creating ? 'Starting…' : 'Start Session'}
            </button>
            {createError && (
              <p className="error" style={{ marginTop: 8 }}>
                {createError}
              </p>
            )}
            {currentSessionId && (
              <p className="muted" style={{ marginTop: 8 }}>
                Current session: {currentSessionId}
              </p>
            )}
          </div>
        </div>
        <div className="spacer" />
        <SessionsPanel
          sessions={sessions}
          loading={sessionsLoading}
          error={sessionsError}
          onRetry={refreshSessions}
          activeId={currentSessionId}
          onSelect={setCurrentSessionId}
        />
      </aside>
      <main className="main">
        {(() => {
          const active = sessions.find((s) => s.id === currentSessionId) ?? null;
          const headerCharacterId = active?.characterId ?? selectedCharacterId;
          const headerSettingId = active?.settingId ?? selectedSettingId;
          return (
            <AppHeader
              characterId={headerCharacterId}
              settingId={headerSettingId}
              hasSession={!!currentSessionId}
            />
          );
        })()}
        <section className="main-content">
          {showBuilder ? <CharacterBuilder /> : <ChatPanel sessionId={currentSessionId} />}
        </section>
      </main>
    </div>
  );
};
