import React, { useState } from 'react';
import { CharactersPanel } from '../features/characters-panel/index.js';
import { SettingsPanel } from '../features/settings-panel/index.js';
import { SessionsPanel } from '../features/sessions-panel/index.js';
import { ChatPanel } from '../features/chat-panel/index.js';
import { CharacterBuilder } from '../features/character-builder/index.js';
import { SettingBuilder } from '../features/setting-builder/index.js';
import { MobileHeader, MobileSidebar } from '../features/mobile-shell/index.js';
import { AppHeader, useAppController } from '../features/app-shell/index.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import type { AppControllerValue } from '../types.js';

export const AppShell: React.FC = () => {
  const controller: AppControllerValue = useAppController();
  const isMobile = useIsMobile();

  return isMobile ? (
    <MobileLayout controller={controller} />
  ) : (
    <DesktopLayout controller={controller} />
  );
};

interface AppLayoutProps {
  controller: AppControllerValue;
}

const DesktopLayout: React.FC<AppLayoutProps> = ({ controller }) => {
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
  } = controller;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">
      <div className="flex h-full">
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

        <main className="flex-1 flex flex-col relative">
          <div className="absolute inset-x-0 top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
            <div className="px-4 py-3">
              <AppHeader
                characterName={charactersData?.find((c) => c.id === activeCharacterId)?.name}
                settingName={settingsData?.find((s) => s.id === activeSettingId)?.name}
                hasSession={!!currentSessionId}
              />
            </div>
          </div>

          <section className="pt-16 h-full overflow-y-auto custom-scrollbar">
            <div className="px-4 pb-6">
              <MainContent
                viewMode={viewMode}
                builderId={builderId}
                refreshCharacters={refreshCharacters}
                refreshSettings={refreshSettings}
                currentSessionId={currentSessionId}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

const MobileLayout: React.FC<AppLayoutProps> = ({ controller }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  } = controller;

  const handleMenuToggle = () => setSidebarOpen((prev) => !prev);
  const handleSidebarClose = () => setSidebarOpen(false);

  const characterName = charactersData?.find((c) => c.id === activeCharacterId)?.name ?? null;
  const settingName = settingsData?.find((s) => s.id === activeSettingId)?.name ?? null;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans flex flex-col">
      <MobileHeader
        onMenuToggle={handleMenuToggle}
        characterName={characterName}
        settingName={settingName}
        hasSession={!!currentSessionId}
      />

      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
        selectedCharacterId={selectedCharacterId}
        onSelectCharacter={setSelectedCharacterId}
        onEditCharacter={navigateToCharacterBuilder}
        characters={charactersData ?? []}
        charactersLoading={charactersLoading}
        charactersError={charactersError}
        onRefreshCharacters={refreshCharacters}
        selectedSettingId={selectedSettingId}
        onSelectSetting={setSelectedSettingId}
        onEditSetting={navigateToSettingBuilder}
        settings={settingsData ?? []}
        settingsLoading={settingsLoading}
        settingsError={settingsError}
        onRefreshSettings={refreshSettings}
        canStartSession={canStart}
        onStartSession={() => void onStartSession()}
        creating={creating}
        createError={createError}
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        sessionsError={sessionsError}
        onRefreshSessions={refreshSessions}
        activeSessionId={currentSessionId}
        onSelectSession={selectSession}
        onDeleteSession={(id: string) => void handleDeleteSession(id)}
      />

      <main className="flex-1 overflow-hidden flex flex-col">
        {viewMode === 'character-builder' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <CharacterBuilder id={builderId} onSave={refreshCharacters} />
          </div>
        ) : viewMode === 'setting-builder' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <SettingBuilder id={builderId} onSave={refreshSettings} />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ChatPanel sessionId={currentSessionId} />
          </div>
        )}
      </main>
    </div>
  );
};

interface MainContentProps {
  viewMode: AppControllerValue['viewMode'];
  builderId: string | null;
  refreshCharacters: () => void;
  refreshSettings: () => void;
  currentSessionId: string | null;
}

const MainContent: React.FC<MainContentProps> = ({
  viewMode,
  builderId,
  refreshCharacters,
  refreshSettings,
  currentSessionId,
}) => {
  if (viewMode === 'character-builder') {
    return <CharacterBuilder id={builderId} onSave={refreshCharacters} />;
  }

  if (viewMode === 'setting-builder') {
    return <SettingBuilder id={builderId} onSave={refreshSettings} />;
  }

  return <ChatPanel sessionId={currentSessionId} />;
};
