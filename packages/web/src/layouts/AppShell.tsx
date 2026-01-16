import React, { Suspense } from 'react';
import { createSession } from '../shared/api/client.js';
import { useAppController } from './hooks/useAppController.js';
import { DevNews } from '../features/dev-news/index.js';
import { useTags } from '../shared/hooks/useTags.js';
import { useItems } from '../shared/hooks/useItems.js';
import { ResponsiveShell } from './ResponsiveShell.js';
import type { AppControllerValue, ViewMode } from '../types.js';
import type { CharacterStudioProps } from '../features/character-studio/index.js';

const ChatPanel = React.lazy(async () => {
  const mod = await import('../features/chat-panel/index.js');
  return { default: mod.ChatPanel };
});

const CharacterStudio = React.lazy(async () => {
  const mod = (await import('../features/character-studio/index.js')) as {
    CharacterStudio: React.ComponentType<CharacterStudioProps>;
  };
  return { default: mod.CharacterStudio };
});

const SettingBuilder = React.lazy(async () => {
  const mod = await import('../features/setting-builder/index.js');
  return { default: mod.SettingBuilder };
});

const ItemBuilder = React.lazy(async () => {
  const mod = await import('../features/item-builder/index.js');
  return { default: mod.ItemBuilder };
});

const TagBuilder = React.lazy(async () => {
  const mod = await import('../features/tag-builder/TagBuilder.js');
  return { default: mod.TagBuilder };
});

const SessionWorkspace = React.lazy(async () => {
  const mod = await import('../features/session-workspace/index.js');
  return { default: mod.SessionWorkspace };
});

const PersonaBuilder = React.lazy(async () => {
  const mod = await import('../features/persona-builder/PersonaBuilder.js');
  return { default: mod.PersonaBuilder };
});

const DocsViewer = React.lazy(async () => {
  const mod = await import('../features/docs/index.js');
  return { default: mod.DocsViewer };
});

const CharacterLibrary = React.lazy(async () => {
  const mod = await import('../features/library/index.js');
  return { default: mod.CharacterLibrary };
});

const SettingLibrary = React.lazy(async () => {
  const mod = await import('../features/library/index.js');
  return { default: mod.SettingLibrary };
});

const TagLibrary = React.lazy(async () => {
  const mod = await import('../features/library/index.js');
  return { default: mod.TagLibrary };
});

const SessionLibrary = React.lazy(async () => {
  const mod = await import('../features/library/index.js');
  return { default: mod.SessionLibrary };
});

const ItemLibrary = React.lazy(async () => {
  const mod = await import('../features/library/index.js');
  return { default: mod.ItemLibrary };
});

const PersonaLibrary = React.lazy(async () => {
  const mod = await import('../features/library/index.js');
  return { default: mod.PersonaLibrary };
});

const LocationView = React.lazy(async () => {
  const mod = await import('../features/locations/index.js');
  return { default: mod.LocationView };
});

export const AppShell: React.FC = () => {
  const controller: AppControllerValue = useAppController();

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
    personasLoading,
    personasError,
    personasData,
    refreshPersonas,
    refreshSessions,
    handleDeleteSession,
    navigateToCharacterStudio,
    navigateToSettingBuilder,
    navigateToTagBuilder,
    navigateToPersonaBuilder,
    navigateToLocationLibrary,
    navigateToLocationBuilder,
    navigateToCharacterLibrary,
    navigateToSettingLibrary,
    navigateToTagLibrary,
    navigateToItemLibrary,
    navigateToPersonaLibrary,
    navigateToSessionLibrary,
    navigateToSessionBuilder,
    navigateToHome,
    selectSession,
    creating,
    createError,
    onCreateSessionFull,
    onSessionCreated,
  } = controller;

  const { loading: tagsLoading, error: tagsError, data: tagsData, retry: refreshTags } = useTags();
  const {
    loading: itemsLoading,
    error: itemsError,
    data: itemsData,
    retry: refreshItems,
  } = useItems();

  const handleStartSession = async (characterId: string, settingId: string, tagIds: string[]) => {
    const newSession = await createSession(characterId, settingId, tagIds);
    controller.setCurrentSessionId(newSession.id);
    controller.refreshSessions();
    window.location.hash = '#/chat';
  };

  return (
    <ResponsiveShell controller={controller}>
      <Suspense fallback={<div className="text-sm text-slate-400">Loading view…</div>}>
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
          tagsLoading={tagsLoading}
          tagsError={tagsError}
          tagsData={tagsData ?? []}
          itemsLoading={itemsLoading}
          itemsError={itemsError}
          itemsData={itemsData ?? []}
          personasLoading={personasLoading}
          personasError={personasError}
          personasData={personasData ?? []}
          refreshCharacters={refreshCharacters}
          refreshSettings={refreshSettings}
          refreshSessions={refreshSessions}
          refreshTags={refreshTags}
          refreshItems={refreshItems}
          refreshPersonas={refreshPersonas}
          handleDeleteSession={handleDeleteSession}
          navigateToCharacterStudio={navigateToCharacterStudio}
          navigateToSettingBuilder={navigateToSettingBuilder}
          navigateToTagBuilder={navigateToTagBuilder}
          navigateToPersonaBuilder={navigateToPersonaBuilder}
          navigateToLocationLibrary={navigateToLocationLibrary}
          navigateToLocationBuilder={navigateToLocationBuilder}
          navigateToCharacterLibrary={navigateToCharacterLibrary}
          navigateToSettingLibrary={navigateToSettingLibrary}
          navigateToTagLibrary={navigateToTagLibrary}
          navigateToItemLibrary={navigateToItemLibrary}
          navigateToPersonaLibrary={navigateToPersonaLibrary}
          navigateToItemBuilder={controller.navigateToItemBuilder}
          navigateToSessionBuilder={navigateToSessionBuilder}
          navigateToSessionLibrary={navigateToSessionLibrary}
          navigateToHome={navigateToHome}
          selectSession={selectSession}
          creating={creating}
          createError={createError}
          onStartSession={handleStartSession}
          onCreateSessionFull={onCreateSessionFull}
          onSessionCreated={onSessionCreated}
        />
      </Suspense>
    </ResponsiveShell>
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
  tagsLoading: boolean;
  tagsError: string | null;
  tagsData: import('../types.js').TagSummary[];
  itemsLoading: boolean;
  itemsError: string | null;
  itemsData: import('../types.js').ItemSummary[];
  personasLoading: boolean;
  personasError: string | null;
  personasData: import('../types.js').PersonaSummary[];
  refreshCharacters: () => void;
  refreshSettings: () => void;
  refreshSessions: () => void;
  refreshTags: () => void;
  refreshItems: () => void;
  refreshPersonas: () => void;
  handleDeleteSession: (id: string) => Promise<void>;
  navigateToCharacterStudio: (id: string | null) => void;
  navigateToSettingBuilder: (id: string | null) => void;
  navigateToTagBuilder: (id?: string | null) => void;
  navigateToPersonaBuilder: (id?: string | null) => void;
  navigateToLocationLibrary: () => void;
  navigateToLocationBuilder: (params?: { mapId?: string; settingId?: string } | null) => void;
  navigateToCharacterLibrary: () => void;
  navigateToSettingLibrary: () => void;
  navigateToTagLibrary: () => void;
  navigateToItemLibrary: () => void;
  navigateToPersonaLibrary: () => void;
  navigateToItemBuilder: (id?: string | null) => void;
  navigateToSessionBuilder: () => void;
  navigateToSessionLibrary: () => void;
  navigateToHome: () => void;
  selectSession: (id: string) => void;
  creating: boolean;
  createError: string | null;
  onStartSession: (characterId: string, settingId: string, tagIds: string[]) => Promise<void>;
  onCreateSessionFull: (
    config: import('../shared/api/client.js').CreateFullSessionRequest
  ) => Promise<string>;
  onSessionCreated: (sessionId: string) => void;
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
  tagsLoading,
  tagsData,
  itemsLoading,
  itemsError,
  itemsData,
  personasLoading,
  personasError,
  personasData,
  refreshCharacters,
  refreshSettings,
  refreshSessions,
  refreshTags,
  refreshItems,
  refreshPersonas,
  handleDeleteSession,
  navigateToCharacterStudio,
  navigateToSettingBuilder,
  navigateToTagBuilder,
  navigateToPersonaBuilder,
  navigateToCharacterLibrary,
  navigateToSettingLibrary,
  navigateToTagLibrary,
  navigateToItemLibrary,
  navigateToPersonaLibrary,
  navigateToItemBuilder,
  navigateToSessionBuilder,
  navigateToHome,
  selectSession,
  onCreateSessionFull,
  onSessionCreated,
}) => {
  switch (viewMode) {
    case 'home':
      return (
        <div className="max-w-5xl mx-auto py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
            <div className="text-center lg:text-left pt-6 lg:pt-10">
              <h1 className="text-3xl font-semibold text-slate-100 mb-4">Welcome to ArcAgentic</h1>
              <p className="text-slate-400 mb-8">
                Create characters, build settings, and start immersive roleplay sessions.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                <button
                  onClick={() => navigateToCharacterStudio(null)}
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
                <button
                  onClick={() => navigateToItemBuilder(null)}
                  className="px-4 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Create Item
                </button>
              </div>

              <div className="mt-6 text-xs text-slate-500">
                Alpha note: expect frequent updates and occasional breaking changes.
              </div>
            </div>

            <div className="lg:pt-6">
              <DevNews />
            </div>
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
          onEdit={navigateToCharacterStudio}
          onCreateNew={() => navigateToCharacterStudio(null)}
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

    case 'item-library':
      return (
        <ItemLibrary
          items={itemsData}
          loading={itemsLoading}
          error={itemsError}
          onRefresh={refreshItems}
          onEdit={navigateToItemBuilder}
          onCreateNew={() => navigateToItemBuilder(null)}
        />
      );

    case 'persona-library':
      return (
        <PersonaLibrary
          personas={personasData}
          loading={personasLoading}
          error={personasError}
          onRefresh={refreshPersonas}
          onEdit={navigateToPersonaBuilder}
          onCreateNew={() => navigateToPersonaBuilder(null)}
        />
      );

    case 'session-library':
      return (
        <SessionLibrary
          sessions={sessions}
          loading={sessionsLoading}
          error={sessionsError}
          onRefresh={refreshSessions}
          onSelect={selectSession}
          onDelete={(id) => {
            void handleDeleteSession(id);
          }}
          onCreateNew={navigateToSessionBuilder}
          activeSessionId={currentSessionId}
        />
      );

    case 'session-builder':
      return (
        <SessionWorkspace
          settings={settingsData}
          settingsLoading={settingsLoading}
          characters={charactersData}
          charactersLoading={charactersLoading}
          personas={personasData}
          personasLoading={personasLoading}
          tags={tagsData}
          tagsLoading={tagsLoading}
          onRefreshSettings={refreshSettings}
          onRefreshCharacters={refreshCharacters}
          onRefreshPersonas={refreshPersonas}
          onRefreshTags={refreshTags}
          onNavigateToSettingBuilder={() => navigateToSettingBuilder(null)}
          onNavigateToCharacterBuilder={() => navigateToCharacterStudio(null)}
          onNavigateToPersonaBuilder={() => navigateToPersonaBuilder(null)}
          onCreateSession={onCreateSessionFull}
          onSessionCreated={onSessionCreated}
        />
      );

    case 'character-studio':
      return (
        <CharacterStudio
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

    case 'item-builder':
      return <ItemBuilder id={builderId} onCancel={navigateToItemLibrary} />;

    case 'persona-builder':
      return (
        <PersonaBuilder
          id={builderId}
          onSave={refreshPersonas}
          onCancel={navigateToPersonaLibrary}
        />
      );

    case 'chat':
      return <ChatPanel sessionId={currentSessionId} />;

    case 'docs':
      return <DocsViewer />;

    case 'location-library':
      return <LocationView onBack={navigateToHome} />;

    case 'location-builder':
      // LocationBuilder is used within the Session Workspace for building session maps
      // The LocationView provides the prefab builder with canvas-based editing
      return <LocationView onBack={navigateToHome} />;

    default:
      return null;
  }
};
