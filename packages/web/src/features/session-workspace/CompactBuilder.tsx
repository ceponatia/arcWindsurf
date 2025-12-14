/**
 * Compact Builder - Power user single-view mode
 * All configuration in one condensed interface
 */

import React, { useState } from 'react';
import {
  useWorkspaceStore,
  useSettingState,
  useNpcsState,
  usePlayerState,
  useTagsState,
  useValidation,
} from './store.js';
import type { SettingSummary, CharacterSummary, PersonaSummary, TagSummary } from '../../types.js';
import type {
  NpcSessionConfig,
  TagSelection,
  NpcRole,
  NpcTier,
  StepValidationState,
} from './store.js';
import type { SettingProfile, PersonaProfile } from '@minimal-rpg/schemas';

interface CompactBuilderProps {
  settings: SettingSummary[];
  characters: CharacterSummary[];
  personas: PersonaSummary[];
  tags: TagSummary[];
  loading: boolean;
  onLaunch: () => Promise<void>;
  launching: boolean;
  error?: string | null;
}

export const CompactBuilder: React.FC<CompactBuilderProps> = ({
  settings,
  characters,
  personas,
  tags,
  loading,
  onLaunch,
  launching,
  error,
}) => {
  const settingState = useSettingState();
  const npcs = useNpcsState();
  const playerState = usePlayerState();
  const selectedTags = useTagsState();
  const validation = useValidation();
  const { selectSetting, addNpc, removeNpc, selectPersona, addTag, removeTag, reset } =
    useWorkspaceStore();

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const selectedNpcIds = npcs.map((n: NpcSessionConfig) => n.characterId);
  const selectedTagIds = selectedTags.map((t: TagSelection) => t.tagId);

  const handleSelectSetting = (setting: SettingSummary) => {
    const profile: SettingProfile = {
      id: setting.id,
      name: setting.name,
      lore: setting.tone ?? '',
    };
    selectSetting(setting.id, profile);
  };

  const handleToggleNpc = (character: CharacterSummary) => {
    if (selectedNpcIds.includes(character.id)) {
      removeNpc(character.id);
    } else {
      const config: NpcSessionConfig = {
        characterId: character.id,
        role: 'supporting' as NpcRole,
        tier: 'minor' as NpcTier,
      };
      addNpc(config);
    }
  };

  const handleSelectPersona = (persona: PersonaSummary) => {
    const profile: PersonaProfile = {
      id: persona.id,
      name: persona.name,
      summary: persona.summary,
    };
    selectPersona(persona.id, profile);
  };

  const handleToggleTag = (tag: TagSummary) => {
    if (selectedTagIds.includes(tag.id)) {
      removeTag(tag.id);
    } else {
      const selection: TagSelection = {
        tagId: tag.id,
        tagName: tag.name,
        scope: 'session',
      };
      addTag(selection);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Flatten validation errors for display
  const validationErrors: string[] = [];
  for (const [, state] of Object.entries(validation.stepErrors) as [
    string,
    StepValidationState | undefined,
  ][]) {
    if (state && !state.valid) {
      validationErrors.push(...state.errors);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Quick Session Builder</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="text-xs px-3 py-1.5 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
          >
            Reset
          </button>
          <button
            onClick={() => void onLaunch()}
            disabled={!validation.isValid || launching}
            className={`
              px-4 py-1.5 text-sm font-medium rounded transition-all
              ${
                validation.isValid && !launching
                  ? 'bg-violet-600 text-white hover:bg-violet-500'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {launching ? 'Creating...' : 'Launch →'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded bg-red-900/30 border border-red-800 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Validation Errors */}
      {!validation.isValid && validationErrors.length > 0 && (
        <div className="p-3 rounded bg-amber-900/20 border border-amber-800/50">
          <div className="flex flex-wrap gap-2 text-xs text-amber-300">
            {validationErrors.map((err: string, idx: number) => (
              <span key={idx} className="flex items-center gap-1">
                <span className="text-amber-500">!</span>
                {err}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Setting Section */}
          <div className="border border-slate-800 rounded-lg bg-slate-900/30">
            <button
              onClick={() => toggleSection('setting')}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${settingState.settingId ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
                <span className="text-sm font-medium text-slate-300">Setting</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {settingState.settingProfile?.name ?? 'None'}
                </span>
                <span className="text-slate-600">{expandedSection === 'setting' ? '▼' : '▶'}</span>
              </div>
            </button>

            {expandedSection === 'setting' && (
              <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                {settings.map((setting) => (
                  <button
                    key={setting.id}
                    onClick={() => handleSelectSetting(setting)}
                    className={`
                      w-full text-left p-2 rounded text-sm transition-colors
                      ${
                        settingState.settingId === setting.id
                          ? 'bg-violet-600/30 text-violet-300'
                          : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                      }
                    `}
                  >
                    {setting.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* NPCs Section */}
          <div className="border border-slate-800 rounded-lg bg-slate-900/30">
            <button
              onClick={() => toggleSection('npcs')}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${npcs.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
                <span className="text-sm font-medium text-slate-300">NPCs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{npcs.length} selected</span>
                <span className="text-slate-600">{expandedSection === 'npcs' ? '▼' : '▶'}</span>
              </div>
            </button>

            {expandedSection === 'npcs' && (
              <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                {characters.map((char) => {
                  const isSelected = selectedNpcIds.includes(char.id);
                  return (
                    <button
                      key={char.id}
                      onClick={() => handleToggleNpc(char)}
                      className={`
                        w-full text-left p-2 rounded text-sm flex items-center justify-between transition-colors
                        ${
                          isSelected
                            ? 'bg-violet-600/30 text-violet-300'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                        }
                      `}
                    >
                      <span>{char.name}</span>
                      {isSelected && <span className="text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Player Section */}
          <div className="border border-slate-800 rounded-lg bg-slate-900/30">
            <button
              onClick={() => toggleSection('player')}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${playerState.personaId ? 'bg-emerald-500' : 'bg-slate-500'}`}
                />
                <span className="text-sm font-medium text-slate-300">Player</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {playerState.personaProfile?.name ?? 'None'}
                </span>
                <span className="text-slate-600">{expandedSection === 'player' ? '▼' : '▶'}</span>
              </div>
            </button>

            {expandedSection === 'player' && (
              <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    const anonymousProfile: PersonaProfile = {
                      id: 'anonymous',
                      name: 'Player',
                      summary: 'Anonymous player',
                    };
                    selectPersona('anonymous', anonymousProfile);
                  }}
                  className={`
                    w-full text-left p-2 rounded text-sm transition-colors
                    ${
                      playerState.personaId === 'anonymous'
                        ? 'bg-violet-600/30 text-violet-300'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    }
                  `}
                >
                  Anonymous Player
                </button>
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => handleSelectPersona(persona)}
                    className={`
                      w-full text-left p-2 rounded text-sm transition-colors
                      ${
                        playerState.personaId === persona.id
                          ? 'bg-violet-600/30 text-violet-300'
                          : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                      }
                    `}
                  >
                    {persona.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="border border-slate-800 rounded-lg bg-slate-900/30">
            <button
              onClick={() => toggleSection('tags')}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-sm font-medium text-slate-300">Tags</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{selectedTags.length} selected</span>
                <span className="text-slate-600">{expandedSection === 'tags' ? '▼' : '▶'}</span>
              </div>
            </button>

            {expandedSection === 'tags' && (
              <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag)}
                      className={`
                        w-full text-left p-2 rounded text-sm flex items-center justify-between transition-colors
                        ${
                          isSelected
                            ? 'bg-violet-600/30 text-violet-300'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                        }
                      `}
                    >
                      <span>{tag.name}</span>
                      {isSelected && <span className="text-xs">✓</span>}
                    </button>
                  );
                })}
                {tags.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-2">No tags available</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Row */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2">
        <span>
          Setting:{' '}
          <span className="text-slate-300">{settingState.settingProfile?.name ?? '-'}</span>
        </span>
        <span>|</span>
        <span>
          NPCs: <span className="text-slate-300">{npcs.length}</span>
        </span>
        <span>|</span>
        <span>
          Player: <span className="text-slate-300">{playerState.personaProfile?.name ?? '-'}</span>
        </span>
        <span>|</span>
        <span>
          Tags: <span className="text-slate-300">{selectedTags.length}</span>
        </span>
      </div>
    </div>
  );
};
