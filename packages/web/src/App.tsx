import React, { useState, useEffect, useRef } from 'react';
import { getErrorMessage } from '@minimal-rpg/utils';
import { AppHeader } from './components/AppHeader.js';
import { CharactersPanel } from './components/CharactersPanel.js';
import { SettingsPanel } from './components/SettingsPanel.js';

import { SessionsPanel } from './components/SessionsPanel.js';
import { ChatPanel } from './components/ChatPanel.js';
import { CharacterBuilder } from './components/CharacterBuilder.js';
import { SettingBuilder } from './components/SettingBuilder.js';
import { createSession, deleteSession } from './api/client.js';
import { useSessions } from './hooks/useSessions.js';
import { useSettings } from './hooks/useSettings.js';

type ViewMode = 'chat' | 'character-builder' | 'setting-builder';

export const App: React.FC = () => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'chat';
    if (window.location.hash.startsWith('#/character-builder')) return 'character-builder';
    if (window.location.hash.startsWith('#/setting-builder')) return 'setting-builder';
    return 'chat';
  });

  const [builderId, setBuilderId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (hash.startsWith('#/character-builder') || hash.startsWith('#/setting-builder')) {
      const query = hash.split('?')[1];
      return new URLSearchParams(query).get('id');
    }
    return null;
  });

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createAbortRef = useRef<AbortController | null>(null);

  const {
    loading: sessionsLoading,
    error: sessionsError,
    data: sessionsData,
    refresh: refreshSessions,
  } = useSessions();

  const {
    loading: settingsLoading,
    error: settingsError,
    data: settingsData,
    retry: refreshSettings,
  } = useSettings();

  const sessions = sessionsData ?? [];
  const canStart = !!(selectedCharacterId && selectedSettingId);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/character-builder')) {
        setViewMode('character-builder');
        const query = hash.split('?')[1];
        setBuilderId(new URLSearchParams(query).get('id'));
      } else if (hash.startsWith('#/setting-builder')) {
        setViewMode('setting-builder');
        const query = hash.split('?')[1];
        setBuilderId(new URLSearchParams(query).get('id'));
      } else {
        setViewMode('chat');
        setBuilderId(null);
      }
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

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      await deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        window.location.hash = '';
      }
      refreshSessions();
    } catch (err) {
      console.error('Failed to delete session', err);
      alert('Failed to delete session');
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col p-3 overflow-hidden">
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
            <CharactersPanel
              selectedId={selectedCharacterId}
              onSelect={setSelectedCharacterId}
              onEdit={(id) => {
                window.location.hash = `#/character-builder?id=${id}`;
              }}
            />
            <SettingsPanel
              selectedId={selectedSettingId}
              onSelect={setSelectedSettingId}
              onEdit={(id) => {
                window.location.hash = `#/setting-builder?id=${id}`;
              }}
              settings={settingsData ?? []}
              loading={settingsLoading}
              error={settingsError}
              onRefresh={refreshSettings}
            />
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
              onDelete={(id) => void handleDeleteSession(id)}
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
              {viewMode === 'character-builder' ? (
                <CharacterBuilder id={builderId} />
              ) : viewMode === 'setting-builder' ? (
                <SettingBuilder id={builderId} onSave={refreshSettings} />
              ) : (
                <ChatPanel sessionId={currentSessionId} />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
