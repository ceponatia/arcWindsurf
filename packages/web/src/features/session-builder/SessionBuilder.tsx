import React, { useState } from 'react';
import type { CharacterSummary, SettingSummary, TagSummary } from '../../types.js';

interface SessionBuilderProps {
  // Characters
  characters: CharacterSummary[];
  charactersLoading: boolean;
  charactersError: string | null;
  onRefreshCharacters: () => void;
  // Settings
  settings: SettingSummary[];
  settingsLoading: boolean;
  settingsError: string | null;
  onRefreshSettings: () => void;
  // Tags (for items/locations - optional)
  tags: TagSummary[];
  tagsLoading: boolean;
  tagsError: string | null;
  onRefreshTags: () => void;
  // Session creation
  creating: boolean;
  createError: string | null;
  onStartSession: (characterId: string, settingId: string, tagIds: string[]) => Promise<void>;
  onCancel: () => void;
}

/** Compact scrollable selection panel */
const SelectionPanel: React.FC<{
  title: string;
  required?: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  emptyMessage: string;
  children: React.ReactNode;
}> = ({ title, required, loading, error, onRefresh, emptyMessage, children }) => (
  <div className="flex flex-col border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30 min-h-0 h-full">
    <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
      <h3 className="text-sm font-semibold text-slate-200">
        {title}
        {required && <span className="text-red-400 ml-1">*</span>}
      </h3>
      <button
        onClick={onRefresh}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Refresh
      </button>
    </div>
    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
      {loading && <p className="text-sm text-slate-500 p-2">Loading…</p>}
      {error && (
        <div className="p-2">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={onRefresh} className="mt-2 text-xs text-slate-400 hover:text-slate-200">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && React.Children.count(children) === 0 && (
        <p className="text-sm text-slate-500 p-2">{emptyMessage}</p>
      )}
      {!loading && !error && children}
    </div>
  </div>
);

/** Selectable card item */
const SelectableCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string | undefined;
  tags?: string[] | undefined;
  variant?: 'single' | 'multi';
}> = ({ selected, onClick, title, subtitle, tags, variant = 'single' }) => (
  <button
    onClick={onClick}
    className={`
      w-full text-left p-3 rounded-lg border transition-all mb-2 last:mb-0
      ${
        selected
          ? variant === 'single'
            ? 'border-violet-500 bg-violet-950/40'
            : 'border-emerald-500 bg-emerald-950/40'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
      }
    `}
  >
    <div className="flex items-center justify-between">
      <span className={`text-sm font-medium ${selected ? 'text-slate-100' : 'text-slate-300'}`}>
        {title}
      </span>
      {selected && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            variant === 'single'
              ? 'bg-violet-600/30 text-violet-300'
              : 'bg-emerald-600/30 text-emerald-300'
          }`}
        >
          {variant === 'single' ? 'Selected' : '✓'}
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{subtitle}</p>}
    {tags && tags.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs px-1 py-0.5 rounded bg-slate-700 text-slate-400">
            {tag}
          </span>
        ))}
        {tags.length > 3 && <span className="text-xs text-slate-500">+{tags.length - 3}</span>}
      </div>
    )}
  </button>
);

export const SessionBuilder: React.FC<SessionBuilderProps> = ({
  characters,
  charactersLoading,
  charactersError,
  onRefreshCharacters,
  settings,
  settingsLoading,
  settingsError,
  onRefreshSettings,
  tags,
  tagsLoading,
  tagsError,
  onRefreshTags,
  creating,
  createError,
  onStartSession,
  onCancel,
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const canStart = selectedCharacterId !== null && selectedSettingId !== null;

  const handleCharacterSelect = (id: string) => {
    setSelectedCharacterId((prev) => (prev === id ? null : id));
  };

  const handleSettingSelect = (id: string) => {
    setSelectedSettingId((prev) => (prev === id ? null : id));
  };

  const handleTagToggle = (id: string) => {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleStartSession = async () => {
    if (!selectedCharacterId || !selectedSettingId) return;
    await onStartSession(selectedCharacterId, selectedSettingId, selectedTagIds);
  };

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">New Session</h1>
            <p className="text-sm text-slate-400 mt-1">
              Select a character and setting to start your adventure
            </p>
          </div>
          <button
            onClick={onCancel}
            className="px-3 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Selection panels - grid layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Characters panel (required) */}
        <SelectionPanel
          title="Character"
          required
          loading={charactersLoading}
          error={charactersError}
          onRefresh={onRefreshCharacters}
          emptyMessage="No characters available. Create one first!"
        >
          {characters.map((char) => (
            <SelectableCard
              key={char.id}
              selected={selectedCharacterId === char.id}
              onClick={() => handleCharacterSelect(char.id)}
              title={char.name}
              subtitle={char.summary}
              tags={char.tags}
            />
          ))}
        </SelectionPanel>

        {/* Settings panel (required) */}
        <SelectionPanel
          title="Setting"
          required
          loading={settingsLoading}
          error={settingsError}
          onRefresh={onRefreshSettings}
          emptyMessage="No settings available. Create one first!"
        >
          {settings.map((setting) => (
            <SelectableCard
              key={setting.id}
              selected={selectedSettingId === setting.id}
              onClick={() => handleSettingSelect(setting.id)}
              title={setting.name}
              subtitle={setting.tone}
            />
          ))}
        </SelectionPanel>

        {/* Tags panel (optional - for modifiers/themes) */}
        <SelectionPanel
          title="Tags"
          loading={tagsLoading}
          error={tagsError}
          onRefresh={onRefreshTags}
          emptyMessage="No tags available"
        >
          {tags.map((tag) => (
            <SelectableCard
              key={tag.id}
              selected={selectedTagIds.includes(tag.id)}
              onClick={() => handleTagToggle(tag.id)}
              title={tag.name}
              subtitle={tag.shortDescription ?? tag.promptText}
              variant="multi"
            />
          ))}
        </SelectionPanel>

        {/* Placeholder for future: Items/Locations */}
        <div className="flex flex-col border border-dashed border-slate-700 rounded-lg overflow-hidden bg-slate-900/20">
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/40 shrink-0">
            <h3 className="text-sm font-semibold text-slate-500">More Options</h3>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-slate-600 text-center">
              Items, Locations, and more coming soon
            </p>
          </div>
        </div>
      </div>

      {/* Footer with Start button */}
      <div className="shrink-0 mt-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {selectedCharacterId && selectedSettingId ? (
              <span className="text-emerald-400">Ready to start!</span>
            ) : (
              <span>
                Select a character
                {!selectedCharacterId && <span className="text-red-400"> ✗</span>}
                {selectedCharacterId && <span className="text-emerald-400"> ✓</span>}
                {' and setting'}
                {!selectedSettingId && <span className="text-red-400"> ✗</span>}
                {selectedSettingId && <span className="text-emerald-400"> ✓</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {createError && <span className="text-sm text-red-400">{createError}</span>}
            <button
              onClick={() => void handleStartSession()}
              disabled={!canStart || creating}
              className={`px-6 py-2.5 text-sm font-medium rounded-md transition-colors ${
                canStart && !creating
                  ? 'bg-violet-600 text-white hover:bg-violet-500'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {creating ? 'Starting…' : 'Start Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
