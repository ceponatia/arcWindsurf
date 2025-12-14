import { useState, useEffect, useRef } from 'react';
import { getErrorMessage } from '@minimal-rpg/utils';
import {
  createSession,
  createSessionFull,
  deleteSession,
  type CreateFullSessionRequest,
} from '../../shared/api/client.js';
import { useSessions } from '../../shared/hooks/useSessions.js';
import { useSettings } from '../../shared/hooks/useSettings.js';
import { useCharacters } from '../../shared/hooks/useCharacters.js';
import { usePersonas } from '../../shared/hooks/usePersonas.js';
import type { AppControllerValue, ViewMode } from '../../types.js';

function parseHashRoute(): { viewMode: ViewMode; builderId: string | null } {
  if (typeof window === 'undefined') return { viewMode: 'home', builderId: null };
  const hash = window.location.hash;

  if (hash.startsWith('#/character-builder')) {
    const query = hash.split('?')[1];
    return {
      viewMode: 'character-builder',
      builderId: new URLSearchParams(query).get('id'),
    };
  }
  if (hash.startsWith('#/setting-builder')) {
    const query = hash.split('?')[1];
    return {
      viewMode: 'setting-builder',
      builderId: new URLSearchParams(query).get('id'),
    };
  }
  if (hash.startsWith('#/tag-builder')) {
    const query = hash.split('?')[1];
    return {
      viewMode: 'tag-builder',
      builderId: new URLSearchParams(query).get('id'),
    };
  }
  if (hash.startsWith('#/item-builder')) {
    const query = hash.split('?')[1];
    return {
      viewMode: 'item-builder',
      builderId: new URLSearchParams(query).get('id'),
    };
  }
  if (hash.startsWith('#/persona-builder')) {
    const query = hash.split('?')[1];
    return {
      viewMode: 'persona-builder',
      builderId: new URLSearchParams(query).get('id'),
    };
  }
  if (hash.startsWith('#/characters')) return { viewMode: 'character-library', builderId: null };
  if (hash.startsWith('#/settings')) return { viewMode: 'setting-library', builderId: null };
  if (hash.startsWith('#/tags')) return { viewMode: 'tag-library', builderId: null };
  if (hash.startsWith('#/items')) return { viewMode: 'item-library', builderId: null };
  if (hash.startsWith('#/personas')) return { viewMode: 'persona-library', builderId: null };
  if (hash.startsWith('#/session-builder')) return { viewMode: 'session-builder', builderId: null };
  if (hash.startsWith('#/sessions')) return { viewMode: 'session-library', builderId: null };
  if (hash.startsWith('#/chat')) return { viewMode: 'chat', builderId: null };
  if (hash.startsWith('#/docs')) return { viewMode: 'docs', builderId: null };

  return { viewMode: 'home', builderId: null };
}

export function useAppController(): AppControllerValue {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => parseHashRoute().viewMode);
  const [builderId, setBuilderId] = useState<string | null>(() => parseHashRoute().builderId);

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
    loading: charactersLoading,
    error: charactersError,
    data: charactersData,
    retry: refreshCharacters,
  } = useCharacters();

  const {
    loading: settingsLoading,
    error: settingsError,
    data: settingsData,
    retry: refreshSettings,
  } = useSettings();

  const {
    loading: personasLoading,
    error: personasError,
    data: personasData,
    retry: refreshPersonas,
  } = usePersonas();

  const sessions = sessionsData ?? [];
  const canStart = !!(selectedCharacterId && selectedSettingId);

  const activeSession = sessions.find((s) => s.id === currentSessionId) ?? null;
  const activeCharacterId = activeSession?.characterTemplateId ?? selectedCharacterId;
  const activeSettingId = activeSession?.settingTemplateId ?? selectedSettingId;

  useEffect(() => {
    const onHashChange = () => {
      const { viewMode: newViewMode, builderId: newBuilderId } = parseHashRoute();
      setViewMode(newViewMode);
      setBuilderId(newBuilderId);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Navigation helpers
  const navigateToHome = () => {
    window.location.hash = '';
  };

  const navigateToCharacterLibrary = () => {
    window.location.hash = '#/characters';
  };

  const navigateToSettingLibrary = () => {
    window.location.hash = '#/settings';
  };

  const navigateToTagLibrary = () => {
    window.location.hash = '#/tags';
  };

  const navigateToItemLibrary = () => {
    window.location.hash = '#/items';
  };

  const navigateToPersonaLibrary = () => {
    window.location.hash = '#/personas';
  };

  const navigateToSessionLibrary = () => {
    window.location.hash = '#/sessions';
  };

  const navigateToSessionBuilder = () => {
    window.location.hash = '#/session-builder';
  };

  const navigateToCharacterBuilder = (id: string | null) => {
    if (id) {
      window.location.hash = `#/character-builder?id=${id}`;
    } else {
      window.location.hash = '#/character-builder';
    }
  };

  const navigateToSettingBuilder = (id: string | null) => {
    if (id) {
      window.location.hash = `#/setting-builder?id=${id}`;
    } else {
      window.location.hash = '#/setting-builder';
    }
  };

  const navigateToTagBuilder = (id?: string | null) => {
    if (id) {
      window.location.hash = `#/tag-builder?id=${id}`;
    } else {
      window.location.hash = '#/tag-builder';
    }
  };

  const navigateToItemBuilder = (id?: string | null) => {
    if (id) {
      window.location.hash = `#/item-builder?id=${id}`;
    } else {
      window.location.hash = '#/item-builder';
    }
  };

  const navigateToPersonaBuilder = (id?: string | null) => {
    if (id) {
      window.location.hash = `#/persona-builder?id=${id}`;
    } else {
      window.location.hash = '#/persona-builder';
    }
  };

  const navigateToChat = () => {
    window.location.hash = '#/chat';
  };

  const onStartSession = async () => {
    if (!canStart || !selectedCharacterId || !selectedSettingId) return;
    setCreating(true);
    setCreateError(null);
    createAbortRef.current?.abort();
    const ctrl = new AbortController();
    createAbortRef.current = ctrl;
    try {
      const newSession = await createSession(
        selectedCharacterId,
        selectedSettingId,
        selectedTagIds,
        ctrl.signal
      );
      setCurrentSessionId(newSession.id);
      navigateToChat();
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
      }
      refreshSessions();
    } catch (err) {
      console.error('Failed to delete session', err);
      alert('Failed to delete session');
    }
  };

  /**
   * Create a full session using the new transactional API.
   * Returns the session ID on success.
   */
  const onCreateSessionFull = async (config: CreateFullSessionRequest): Promise<string> => {
    setCreating(true);
    setCreateError(null);
    createAbortRef.current?.abort();
    const ctrl = new AbortController();
    createAbortRef.current = ctrl;
    try {
      const response = await createSessionFull(config, ctrl.signal);
      refreshSessions();
      return response.id;
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to create session');
      setCreateError(msg);
      throw new Error(msg);
    } finally {
      setCreating(false);
    }
  };

  /**
   * Callback for SessionWorkspace after session is created.
   * Navigates to chat.
   */
  const onSessionCreated = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    navigateToChat();
  };

  const selectSession = (id: string) => {
    setCurrentSessionId(id);
    navigateToChat();
  };

  return {
    selectedCharacterId,
    setSelectedCharacterId,
    selectedSettingId,
    setSelectedSettingId,
    selectedTagIds,
    setSelectedTagIds,
    currentSessionId,
    setCurrentSessionId,
    viewMode,
    builderId,
    creating,
    createError,
    sessionsLoading,
    sessionsError,
    sessionsData,
    refreshSessions,
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
    sessions,
    canStart,
    onStartSession,
    onCreateSessionFull,
    onSessionCreated,
    handleDeleteSession,
    activeCharacterId,
    activeSettingId,
    navigateToCharacterBuilder,
    navigateToSettingBuilder,
    navigateToTagBuilder,
    navigateToItemBuilder,
    navigateToPersonaBuilder,
    navigateToCharacterLibrary,
    navigateToSettingLibrary,
    navigateToTagLibrary,
    navigateToItemLibrary,
    navigateToPersonaLibrary,
    navigateToSessionLibrary,
    navigateToSessionBuilder,
    navigateToHome,
    selectSession,
  };
}
