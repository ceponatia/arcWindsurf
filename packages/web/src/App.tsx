import React, { useState, useEffect, useRef } from 'react';
import { getErrorMessage } from '@minimal-rpg/utils';
import { AppHeader } from './components/AppHeader.js';
import { CharactersPanel } from './components/CharactersPanel.js';
import { SettingsSelector } from './components/SettingsSelector.js';
import * as db from '@minimal-rpg/db';
import { API_BASE_URL } from './config.js';

const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 6h18" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
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
  const [settingsReloadKey, setSettingsReloadKey] = useState(0);

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

  const handleDeleteSetting = async (settingId: string) => {
    try {
      await db.deleteSettingFromDb(settingId, API_BASE_URL);
      setSelectedSettingId((prev) => (prev === settingId ? null : prev));
      setSettingsReloadKey((k) => k + 1);
    } catch (e) {
      // Check if 'e' is actually an Error object
      if (e instanceof Error) {
        console.error('Failed to delete setting', e.message);
      } else {
        // Fallback for non-standard errors (like strings)
        console.error('Failed to delete setting', String(e));
      }
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col p-3 overflow-hidden">
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
            <CharactersPanel selectedId={selectedCharacterId} onSelect={setSelectedCharacterId} />
            {/* Settings card with delete action when a setting is selected */}
            <section className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Settings</h2>
                {selectedSettingId && (
                  <button
                    onClick={() => {
                      void handleDeleteSetting(selectedSettingId);
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-red-400 hover:text-red-300"
                    aria-label="Delete setting"
                    title="Delete selected setting"
                  >
                    <TrashIcon size={18} />
                  </button>
                )}
              </div>
              <div className="p-3">
                <SettingsSelector
                  key={settingsReloadKey}
                  value={selectedSettingId}
                  onChange={setSelectedSettingId}
                />
              </div>
            </section>
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
