import React, { useState, useEffect, useRef } from 'react';
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState<boolean>(
    typeof window !== 'undefined' && window.location.hash === '#/character-builder'
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createAbortRef = useRef<AbortController | null>(null);

  const {
    loading: sessionsLoading,
    error: sessionsError,
    data: sessionsData,
    refresh: refreshSessions,
  } = useSessions();

  const sessions = sessionsData ?? [];
  const canStart = !!(selectedCharacterId && selectedSettingId);

  useEffect(() => {
    const onHashChange = () => {
      setShowBuilder(window.location.hash === '#/character-builder');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const onStartSession = async () => {
    if (!canStart || !selectedCharacterId || !selectedSettingId) return;
    setCreating(true);
    setCreateError(null);
    createAbortRef.current?.abort();
    const ctrl = new AbortController();
    createAbortRef.current = ctrl;
    try {
      const newSession = await createSession(selectedCharacterId, selectedSettingId, ctrl.signal);
      setCurrentSessionId(newSession.id);
      window.location.hash = '';
      refreshSessions();
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Failed to start session'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col p-3 overflow-hidden">
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
            <CharactersPanel selectedId={selectedCharacterId} onSelect={setSelectedCharacterId} />
            <SettingsSelector value={selectedSettingId} onChange={setSelectedSettingId} />
            <div className="border border-slate-800 rounded-lg p-3">
              <button
                className={`w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
                  canStart
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                disabled={!canStart}
                onClick={() => void onStartSession()}
              >
                {creating ? 'Starting…' : 'Start Session'}
              </button>
              {createError && <p className="mt-2 text-sm text-red-400">{createError}</p>}
              {currentSessionId && (
                <p className="mt-2 text-xs text-slate-400">Current session: {currentSessionId}</p>
              )}
            </div>
            <SessionsPanel
              sessions={sessions}
              loading={sessionsLoading}
              error={sessionsError}
              onRetry={refreshSessions}
              activeId={currentSessionId}
              onSelect={(id) => {
                setCurrentSessionId(id);
                window.location.hash = '';
              }}
            />
          </div>
        </aside>

        {/* Main Area */}
        <main className="flex-1 flex flex-col relative">
          {/* Header */}
          <div className="absolute inset-x-0 top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
            <div className="px-4 py-3">
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
            </div>
          </div>

          {/* Content Canvas */}
          <section className="pt-16 h-full overflow-y-auto custom-scrollbar">
            <div className="px-4 pb-6">
              {showBuilder ? <CharacterBuilder /> : <ChatPanel sessionId={currentSessionId} />}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
