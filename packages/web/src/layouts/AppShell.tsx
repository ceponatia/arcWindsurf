import React, { useState } from 'react';
import { ChatPanel } from '../features/chat-panel/index.js';
import { CharacterBuilder } from '../features/character-builder/index.js';
import { SettingBuilder } from '../features/setting-builder/index.js';
import { TagBuilder } from '../features/tag-builder/TagBuilder.js';
import {
  CharacterLibrary,
  SettingLibrary,
  TagLibrary,
  SessionLibrary,
} from '../features/library/index.js';
import { MobileHeader } from '../features/mobile-shell/index.js';
import { useAppController } from './hooks/useAppController.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import type { AppControllerValue, ViewMode } from '../types.js';

// Icons for sidebar navigation
const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
  </svg>
);

const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
  </svg>
);

const TagIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39.92 3.31 0l4.253-4.253a2.344 2.344 0 000-3.31l-9.58-9.581a3 3 0 00-2.122-.879H5.25zM6.375 7.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z"
      clipRule="evenodd"
    />
  </svg>
);

const ChatIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z"
      clipRule="evenodd"
    />
  </svg>
);

const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
  </svg>
);

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

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const DesktopLayout: React.FC<AppLayoutProps> = ({ controller }) => {
  const {
    viewMode,
    builderId,
    currentSessionId,
    sessions,
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
    refreshSessions,
    handleDeleteSession,
    navigateToCharacterBuilder,
    navigateToSettingBuilder,
    navigateToTagBuilder,
    navigateToCharacterLibrary,
    navigateToSettingLibrary,
    navigateToTagLibrary,
    navigateToSessionLibrary,
    navigateToHome,
    selectSession,
  } = controller;

  const isLibraryView = [
    'character-library',
    'setting-library',
    'tag-library',
    'session-library',
  ].includes(viewMode);
  const isBuilderView = ['character-builder', 'setting-builder', 'tag-builder'].includes(viewMode);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">
      <div className="flex h-full">
        {/* Slim navigation sidebar */}
        <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
          {/* Logo / Brand */}
          <div className="p-4 border-b border-slate-800">
            <button
              onClick={navigateToHome}
              className="text-lg font-semibold text-slate-100 hover:text-violet-400 transition-colors"
            >
              Minimal RPG
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            <NavButton
              icon={<HomeIcon className="w-5 h-5" />}
              label="Home"
              active={viewMode === 'home'}
              onClick={navigateToHome}
            />
            <NavButton
              icon={<UsersIcon className="w-5 h-5" />}
              label="Characters"
              active={viewMode === 'character-library' || viewMode === 'character-builder'}
              onClick={navigateToCharacterLibrary}
            />
            <NavButton
              icon={<GlobeIcon className="w-5 h-5" />}
              label="Settings"
              active={viewMode === 'setting-library' || viewMode === 'setting-builder'}
              onClick={navigateToSettingLibrary}
            />
            <NavButton
              icon={<TagIcon className="w-5 h-5" />}
              label="Tags"
              active={viewMode === 'tag-library' || viewMode === 'tag-builder'}
              onClick={navigateToTagLibrary}
            />
            <NavButton
              icon={<ChatIcon className="w-5 h-5" />}
              label="Sessions"
              active={viewMode === 'session-library' || viewMode === 'chat'}
              onClick={navigateToSessionLibrary}
            />
          </nav>

          {/* Footer with DB View link */}
          <div className="p-3 border-t border-slate-800">
            <a
              href="/dbview"
              className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              DB View
            </a>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <section className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6">
              <MainContent
                viewMode={viewMode}
                builderId={builderId}
                currentSessionId={currentSessionId}
                sessions={sessions}
                sessionsLoading={sessionsLoading}
                sessionsError={sessionsError}
                charactersLoading={charactersLoading}
                charactersError={charactersError}
                charactersData={charactersData ?? []}
                settingsLoading={settingsLoading}
                settingsError={settingsError}
                settingsData={settingsData ?? []}
                refreshCharacters={refreshCharacters}
                refreshSettings={refreshSettings}
                refreshSessions={refreshSessions}
                handleDeleteSession={handleDeleteSession}
                navigateToCharacterBuilder={navigateToCharacterBuilder}
                navigateToSettingBuilder={navigateToSettingBuilder}
                navigateToTagBuilder={navigateToTagBuilder}
                navigateToCharacterLibrary={navigateToCharacterLibrary}
                navigateToSettingLibrary={navigateToSettingLibrary}
                navigateToTagLibrary={navigateToTagLibrary}
                selectSession={selectSession}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

const MobileLayout: React.FC<AppLayoutProps> = ({ controller }) => {
  const [navOpen, setNavOpen] = useState(false);
  const {
    viewMode,
    builderId,
    currentSessionId,
    sessions,
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
    refreshSessions,
    handleDeleteSession,
    navigateToCharacterBuilder,
    navigateToSettingBuilder,
    navigateToTagBuilder,
    navigateToCharacterLibrary,
    navigateToSettingLibrary,
    navigateToTagLibrary,
    navigateToSessionLibrary,
    navigateToHome,
    selectSession,
  } = controller;

  const handleNavClose = () => setNavOpen(false);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans flex flex-col">
      {/* Mobile header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
        <button onClick={navigateToHome} className="text-lg font-semibold text-slate-100">
          Minimal RPG
        </button>
        <button
          onClick={() => setNavOpen(!navOpen)}
          className="p-2 rounded-md text-slate-300 hover:bg-slate-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path
              fillRule="evenodd"
              d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </header>

      {/* Mobile navigation drawer */}
      {navOpen && (
        <div className="absolute inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={handleNavClose} />
          <nav className="relative w-64 bg-slate-900 h-full p-4 space-y-2">
            <NavButton
              icon={<HomeIcon className="w-5 h-5" />}
              label="Home"
              active={viewMode === 'home'}
              onClick={() => {
                navigateToHome();
                handleNavClose();
              }}
            />
            <NavButton
              icon={<UsersIcon className="w-5 h-5" />}
              label="Characters"
              active={viewMode === 'character-library' || viewMode === 'character-builder'}
              onClick={() => {
                navigateToCharacterLibrary();
                handleNavClose();
              }}
            />
            <NavButton
              icon={<GlobeIcon className="w-5 h-5" />}
              label="Settings"
              active={viewMode === 'setting-library' || viewMode === 'setting-builder'}
              onClick={() => {
                navigateToSettingLibrary();
                handleNavClose();
              }}
            />
            <NavButton
              icon={<TagIcon className="w-5 h-5" />}
              label="Tags"
              active={viewMode === 'tag-library' || viewMode === 'tag-builder'}
              onClick={() => {
                navigateToTagLibrary();
                handleNavClose();
              }}
            />
            <NavButton
              icon={<ChatIcon className="w-5 h-5" />}
              label="Sessions"
              active={viewMode === 'session-library' || viewMode === 'chat'}
              onClick={() => {
                navigateToSessionLibrary();
                handleNavClose();
              }}
            />
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <MainContent
          viewMode={viewMode}
          builderId={builderId}
          currentSessionId={currentSessionId}
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          sessionsError={sessionsError}
          charactersLoading={charactersLoading}
          charactersError={charactersError}
          charactersData={charactersData ?? []}
          settingsLoading={settingsLoading}
          settingsError={settingsError}
          settingsData={settingsData ?? []}
          refreshCharacters={refreshCharacters}
          refreshSettings={refreshSettings}
          refreshSessions={refreshSessions}
          handleDeleteSession={handleDeleteSession}
          navigateToCharacterBuilder={navigateToCharacterBuilder}
          navigateToSettingBuilder={navigateToSettingBuilder}
          navigateToTagBuilder={navigateToTagBuilder}
          navigateToCharacterLibrary={navigateToCharacterLibrary}
          navigateToSettingLibrary={navigateToSettingLibrary}
          navigateToTagLibrary={navigateToTagLibrary}
          selectSession={selectSession}
        />
      </main>
    </div>
  );
};

interface MainContentProps {
  viewMode: ViewMode;
  builderId: string | null;
  currentSessionId: string | null;
  sessions: AppControllerValue['sessions'];
  sessionsLoading: boolean;
  sessionsError: string | null;
  charactersLoading: boolean;
  charactersError: string | null;
  charactersData: NonNullable<AppControllerValue['charactersData']>;
  settingsLoading: boolean;
  settingsError: string | null;
  settingsData: NonNullable<AppControllerValue['settingsData']>;
  refreshCharacters: () => void;
  refreshSettings: () => void;
  refreshSessions: () => void;
  handleDeleteSession: (id: string) => Promise<void>;
  navigateToCharacterBuilder: (id: string | null) => void;
  navigateToSettingBuilder: (id: string | null) => void;
  navigateToTagBuilder: (id?: string | null) => void;
  navigateToCharacterLibrary: () => void;
  navigateToSettingLibrary: () => void;
  navigateToTagLibrary: () => void;
  selectSession: (id: string) => void;
}

const MainContent: React.FC<MainContentProps> = ({
  viewMode,
  builderId,
  currentSessionId,
  sessions,
  sessionsLoading,
  sessionsError,
  charactersLoading,
  charactersError,
  charactersData,
  settingsLoading,
  settingsError,
  settingsData,
  refreshCharacters,
  refreshSettings,
  refreshSessions,
  handleDeleteSession,
  navigateToCharacterBuilder,
  navigateToSettingBuilder,
  navigateToTagBuilder,
  navigateToCharacterLibrary,
  navigateToSettingLibrary,
  navigateToTagLibrary,
  selectSession,
}) => {
  switch (viewMode) {
    case 'home':
      return (
        <div className="max-w-2xl mx-auto text-center py-16">
          <h1 className="text-3xl font-semibold text-slate-100 mb-4">Welcome to Minimal RPG</h1>
          <p className="text-slate-400 mb-8">
            Create characters, build settings, and start immersive roleplay sessions.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigateToCharacterBuilder(null)}
              className="px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              Create Character
            </button>
            <button
              onClick={() => navigateToSettingBuilder(null)}
              className="px-4 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Create Setting
            </button>
          </div>
        </div>
      );

    case 'character-library':
      return (
        <CharacterLibrary
          characters={charactersData}
          loading={charactersLoading}
          error={charactersError}
          onRefresh={refreshCharacters}
          onEdit={navigateToCharacterBuilder}
          onCreateNew={() => navigateToCharacterBuilder(null)}
        />
      );

    case 'setting-library':
      return (
        <SettingLibrary
          settings={settingsData}
          loading={settingsLoading}
          error={settingsError}
          onRefresh={refreshSettings}
          onEdit={navigateToSettingBuilder}
          onCreateNew={() => navigateToSettingBuilder(null)}
        />
      );

    case 'tag-library':
      return (
        <TagLibrary onEdit={navigateToTagBuilder} onCreateNew={() => navigateToTagBuilder(null)} />
      );

    case 'session-library':
      return (
        <SessionLibrary
          sessions={sessions}
          loading={sessionsLoading}
          error={sessionsError}
          onRefresh={refreshSessions}
          onSelect={selectSession}
          onDelete={(id) => void handleDeleteSession(id)}
          activeSessionId={currentSessionId}
        />
      );

    case 'character-builder':
      return (
        <CharacterBuilder
          id={builderId}
          onSave={refreshCharacters}
          onCancel={navigateToCharacterLibrary}
        />
      );

    case 'setting-builder':
      return (
        <SettingBuilder
          id={builderId}
          onSave={refreshSettings}
          onCancel={navigateToSettingLibrary}
        />
      );

    case 'tag-builder':
      return <TagBuilder id={builderId} onCancel={navigateToTagLibrary} />;

    case 'chat':
      return <ChatPanel sessionId={currentSessionId} />;

    default:
      return null;
  }
};
