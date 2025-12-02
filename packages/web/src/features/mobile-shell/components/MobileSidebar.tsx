import React, { useEffect, useCallback } from 'react';
import type { MobileSidebarProps } from '../../../types.js';
import { CharactersPanel } from '../../characters-panel/CharactersPanel.js';
import { SettingsPanel } from '../../settings-panel/SettingsPanel.js';
import { SessionsPanel } from '@minimal-rpg/ui';

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  selectedCharacterId,
  onSelectCharacter,
  onEditCharacter,
  characters,
  charactersLoading,
  charactersError,
  onRefreshCharacters,
  selectedSettingId,
  onSelectSetting,
  onEditSetting,
  settings,
  settingsLoading,
  settingsError,
  onRefreshSettings,
  canStartSession,
  onStartSession,
  creating,
  createError,
  sessions,
  sessionsLoading,
  sessionsError,
  onRefreshSessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
}) => {
  // Close on escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSessionSelect = (id: string) => {
    onSelectSession(id);
    onClose();
  };

  const handleStartSession = () => {
    onStartSession();
    // Don't close immediately - let the session create, the ChatPanel will update
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar drawer */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-200">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-md hover:bg-slate-800 active:bg-slate-700 transition-colors"
            aria-label="Close menu"
          >
            <CloseIcon className="text-slate-300" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="h-[calc(100%-52px)] overflow-y-auto custom-scrollbar p-3 space-y-3">
          <CharactersPanel
            selectedId={selectedCharacterId}
            onSelect={onSelectCharacter}
            onEdit={onEditCharacter}
            characters={characters}
            loading={charactersLoading}
            error={charactersError}
            onRefresh={onRefreshCharacters}
          />

          <SettingsPanel
            selectedId={selectedSettingId}
            onSelect={onSelectSetting}
            onEdit={onEditSetting}
            settings={settings}
            loading={settingsLoading}
            error={settingsError}
            onRefresh={onRefreshSettings}
          />

          {/* Start Session Button */}
          <div className="border border-slate-800 rounded-lg p-3">
            <button
              className={`w-full inline-flex items-center justify-center rounded-md px-3 py-2.5 text-sm font-medium transition ${
                canStartSession
                  ? 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              disabled={!canStartSession}
              onClick={handleStartSession}
            >
              {creating ? 'Starting…' : 'Start Session'}
            </button>
            {createError && <p className="mt-2 text-sm text-red-400">{createError}</p>}
          </div>

          <SessionsPanel
            sessions={sessions}
            loading={sessionsLoading}
            error={sessionsError}
            onRetry={onRefreshSessions}
            activeId={activeSessionId}
            onSelect={handleSessionSelect}
            onDelete={onDeleteSession}
          />
        </div>
      </aside>
    </>
  );
};
