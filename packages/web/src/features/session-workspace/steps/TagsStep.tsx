/**
 * Tags Step - Select rules, scenarios, and modifier tags with scope assignment
 */

import React, { useState } from 'react';
import { useWorkspaceStore, useTagsState, useNpcsState } from '../store.js';
import type { TagSelection, NpcSessionConfig } from '../store.js';
import type { TagSummary, CharacterSummary } from '../../../types.js';
import { AlertCircle } from 'lucide-react';

interface TagsStepProps {
  availableTags: TagSummary[];
  characters: CharacterSummary[];
  loading: boolean;
  onRefresh: () => void;
}

export const TagsStep: React.FC<TagsStepProps> = ({
  availableTags,
  characters,
  loading,
  onRefresh,
}) => {
  const tags = useTagsState();
  const npcs = useNpcsState();
  const { addTag, removeTag, updateTag, clearTags } = useWorkspaceStore();
  const [showConfigFor, setShowConfigFor] = useState<string | null>(null);

  const selectedTagIds = tags.map((t: TagSelection) => t.tagId);

  // Get character name by ID
  const getCharacterName = (characterId: string): string => {
    const char = characters.find((c) => c.id === characterId);
    if (char) return char.name;
    const npc = npcs.find((n: NpcSessionConfig) => n.characterId === characterId);
    if (npc?.label) return npc.label;
    return 'Unknown';
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

  // Handle scope change
  const handleScopeChange = (tagId: string, scope: 'session' | 'npc', targetId?: string) => {
    const update: Partial<TagSelection> = { scope };
    if (targetId !== undefined) {
      update.targetId = targetId;
    }
    updateTag(tagId, update);
  };

  // Get tag selection config
  const getTagConfig = (tagId: string): TagSelection | undefined => {
    return tags.find((t: TagSelection) => t.tagId === tagId);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Rules & Tags</h2>
        <p className="text-sm text-slate-400 mt-1">
          Customize gameplay with rules, scenarios, and modifiers. These affect how the session
          plays out.
        </p>
      </div>

      {/* Tag Grid */}
      <div className="border border-slate-800 rounded-lg bg-slate-900/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">
            Available Tags ({availableTags.length})
          </span>
          <button
            onClick={onRefresh}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="p-4 max-h-80 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading tags...</p>
          ) : availableTags.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tags available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);

                return (
                  <div
                    key={tag.id}
                    className={`
                      p-3 rounded-lg border transition-all
                      ${
                        isSelected
                          ? 'border-violet-500/50 bg-violet-950/30'
                          : 'border-slate-700 bg-slate-800/30'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => handleToggleTag(tag)}
                          className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                            ${
                              isSelected
                                ? 'border-violet-500 bg-violet-600'
                                : 'border-slate-600 hover:border-slate-500'
                            }
                          `}
                        >
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{tag.name}</p>
                          {tag.shortDescription && (
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {tag.shortDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <button
                          onClick={() => setShowConfigFor(showConfigFor === tag.id ? null : tag.id)}
                          className="text-xs text-slate-500 hover:text-slate-300 ml-2"
                        >
                          ⚙
                        </button>
                      )}
                    </div>

                    {/* Inline Config */}
                    {isSelected && showConfigFor === tag.id && (
                      <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                        {/* Scope selection */}
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Scope</label>
                          <div className="flex items-center gap-2">
                            <select
                              value={getTagConfig(tag.id)?.scope ?? 'session'}
                              onChange={(e) => {
                                const newScope = e.target.value as 'session' | 'npc';
                                handleScopeChange(tag.id, newScope);
                              }}
                              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                            >
                              <option value="session">Session-wide</option>
                              <option value="npc">Specific NPC</option>
                            </select>

                            {getTagConfig(tag.id)?.scope === 'npc' && (
                              <select
                                value={getTagConfig(tag.id)?.targetId ?? ''}
                                onChange={(e) => {
                                  handleScopeChange(tag.id, 'npc', e.target.value || undefined);
                                }}
                                className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                              >
                                <option value="">Select NPC...</option>
                                {npcs.map((npc: NpcSessionConfig) => (
                                  <option key={npc.characterId} value={npc.characterId}>
                                    {getCharacterName(npc.characterId)}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Warning if NPC scope without target */}
                          {getTagConfig(tag.id)?.scope === 'npc' &&
                            !getTagConfig(tag.id)?.targetId && (
                              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Select an NPC for this tag
                              </p>
                            )}
                        </div>

                        {tag.promptText && (
                          <div>
                            <label className="text-xs text-slate-400">Prompt Effect</label>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {tag.promptText}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Tags Summary */}
      {tags.length > 0 && (
        <div className="border border-slate-800 rounded-lg bg-slate-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">
              Selected Tags ({tags.length})
            </span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">
                {tags.filter((t: TagSelection) => t.scope === 'session').length} session-wide,{' '}
                {tags.filter((t: TagSelection) => t.scope === 'npc').length} NPC-scoped
              </span>
              <button onClick={clearTags} className="text-xs text-slate-500 hover:text-red-400">
                Clear All
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag: TagSelection) => (
              <div
                key={tag.tagId}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                  ${tag.scope === 'npc' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-violet-900/50 text-violet-300'}
                `}
              >
                <span>{tag.tagName ?? tag.tagId}</span>
                {tag.scope === 'npc' && tag.targetId && (
                  <span className="text-xs opacity-70">({getCharacterName(tag.targetId)})</span>
                )}
                <button onClick={() => removeTag(tag.tagId)} className="hover:text-red-400">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tags.length === 0 && (
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
          <p className="text-sm text-slate-500">
            No tags selected. Tags are optional but can enhance your session.
          </p>
        </div>
      )}
    </div>
  );
};
