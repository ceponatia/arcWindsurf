import React, { useState } from 'react';
import { useAppController } from './hooks/useAppController.js';
import { MobileHeader } from './components/MobileHeader.js';
import { MobileSidebar } from './components/MobileSidebar.js';
import { ChatPanel } from './components/ChatPanel.js';
import { CharacterBuilder } from './components/CharacterBuilder.js';
import { SettingBuilder } from './components/SettingBuilder.js';

export const MobileApp: React.FC = () => {
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
  } = useAppController();

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

      {/* Main Content */}
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
