import { useState, useEffect, useRef } from 'react';
import { getErrorMessage } from '@minimal-rpg/utils';
import { createSession, deleteSession } from '../../shared/api/client.js';
import { useSessions } from '../../shared/hooks/useSessions.js';
import { useSettings } from '../../shared/hooks/useSettings.js';
import { useCharacters } from '../../shared/hooks/useCharacters.js';
import type { AppControllerValue, ViewMode } from '../../types.js';

export function useAppController(): AppControllerValue {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'chat';
    if (window.location.hash.startsWith('#/character-builder')) return 'character-builder';
    if (window.location.hash.startsWith('#/setting-builder')) return 'setting-builder';
    if (window.location.hash.startsWith('#/tag-builder')) return 'tag-builder';
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

  const sessions = sessionsData ?? [];
  const canStart = !!(selectedCharacterId && selectedSettingId);

  const activeSession = sessions.find((s) => s.id === currentSessionId) ?? null;
  const activeCharacterId = activeSession?.characterTemplateId ?? selectedCharacterId;
  const activeSettingId = activeSession?.settingTemplateId ?? selectedSettingId;

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
      } else if (hash.startsWith('#/tag-builder')) {
        setViewMode('tag-builder');
        setBuilderId(null);
      } else {
        setViewMode('chat');
        setBuilderId(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateToCharacterBuilder = (id: string) => {
    window.location.hash = `#/character-builder?id=${id}`;
  };

  const navigateToSettingBuilder = (id: string) => {
    window.location.hash = `#/setting-builder?id=${id}`;
  };

  const navigateToTagBuilder = () => {
    window.location.hash = '#/tag-builder';
  };

  const navigateToChat = () => {
    window.location.hash = '';
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
        navigateToChat();
      }
      refreshSessions();
    } catch (err) {
      console.error('Failed to delete session', err);
      alert('Failed to delete session');
    }
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
    sessions,
    canStart,
    onStartSession,
    handleDeleteSession,
    activeCharacterId,
    activeSettingId,
    navigateToCharacterBuilder,
    navigateToSettingBuilder,
    navigateToTagBuilder,
    selectSession,
  };
}
