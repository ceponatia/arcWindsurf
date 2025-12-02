import React from 'react';
import { AppHeader, useAppController } from './features/app-shell/index.js';
import { CharactersPanel } from './features/characters-panel/index.js';
import { SettingsPanel } from './features/settings-panel/index.js';
import { SessionsPanel } from './features/sessions-panel/index.js';
import { ChatPanel } from './features/chat-panel/index.js';
import { CharacterBuilder } from './features/character-builder/index.js';
import { SettingBuilder } from './features/setting-builder/index.js';

export const DesktopApp: React.FC = () => {
  const {
    selectedCharacterId,
    setSelectedCharacterId,
    selectedSettingId,
    setSelectedSettingId,
    currentSessionId,
    viewMode,
    builderId,
    creating,
    createError,
    sessionsLoading,
    sessionsError,
    charactersLoading,
    charactersError,
    charactersData,
    refreshCharacters,
    settingsLoading,
    settingsError,
    settingsData,
    refreshSettings,
    sessions,
    canStart,
    onStartSession,
    handleDeleteSession,
    refreshSessions,
    activeCharacterId,
    activeSettingId,
    navigateToCharacterBuilder,
    navigateToSettingBuilder,
    selectSession,
  } = useAppController();

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col p-3 overflow-hidden">
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
            <CharactersPanel
              selectedId={selectedCharacterId}
              onSelect={setSelectedCharacterId}
              onEdit={navigateToCharacterBuilder}
              characters={charactersData ?? []}
              loading={charactersLoading}
              error={charactersError}
              onRefresh={refreshCharacters}
            />
            <SettingsPanel
              selectedId={selectedSettingId}
              onSelect={setSelectedSettingId}
              onEdit={navigateToSettingBuilder}
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
              onSelect={selectSession}
              onDelete={(id: string) => void handleDeleteSession(id)}
            />
          </div>
        </aside>

        {/* Main Area */}
        <main className="flex-1 flex flex-col relative">
          {/* Header */}
          <div className="absolute inset-x-0 top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
            <div className="px-4 py-3">
              <AppHeader
                characterName={charactersData?.find((c) => c.id === activeCharacterId)?.name}
                settingName={settingsData?.find((s) => s.id === activeSettingId)?.name}
                hasSession={!!currentSessionId}
              />
            </div>
          </div>

          {/* Content Canvas */}
          <section className="pt-16 h-full overflow-y-auto custom-scrollbar">
            <div className="px-4 pb-6">
              {viewMode === 'character-builder' ? (
                <CharacterBuilder id={builderId} onSave={refreshCharacters} />
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
