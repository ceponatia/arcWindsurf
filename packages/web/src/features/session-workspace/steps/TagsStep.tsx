/**
 * Tags Step - Select rules, scenarios, and modifier tags with scope assignment
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useWorkspaceStore, useTagsState, useNpcsState } from '../store.js';
import type { TagSelection, NpcSessionConfig } from '../store.js';
import type { TagSummary, CharacterSummary } from '../../../types.js';
import { AlertCircle } from 'lucide-react';

const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';

interface LocationOption {
  id: string;
  name: string;
}

function isLocationOption(value: LocationOption | null): value is LocationOption {
  return value !== null;
}

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
  const locationsState = useWorkspaceStore((s) => s.locations);
  const { addTag, removeTag, updateTag, clearTags, setStep } = useWorkspaceStore();
  const [showConfigFor, setShowConfigFor] = useState<string | null>(null);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationOptionsLoading, setLocationOptionsLoading] = useState(false);
  const [locationOptionsError, setLocationOptionsError] = useState<string | null>(null);

  const selectedTagIds = tags.map((t: TagSelection) => t.tagId);

  const visibleTags = useMemo(
    () =>
      availableTags.filter(
        (t) =>
          // Deprecated targets - hidden from session setup UI for now
          t.targetType !== 'player' && t.targetType !== 'setting'
      ),
    [availableTags]
  );

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
        targetType: tag.targetType ?? 'session',
        ...(tag.targetType === 'character' || tag.targetType === 'location'
          ? { targetEntityIds: [] }
          : {}),
      };
      addTag(selection);
    }
  };

  // Get tag selection config
  const getTagConfig = (tagId: string): TagSelection | undefined => {
    return tags.find((t: TagSelection) => t.tagId === tagId);
  };

  const toggleTargetEntity = (tagId: string, entityId: string) => {
    const cfg = getTagConfig(tagId);
    const current = cfg?.targetEntityIds ?? [];
    const next = current.includes(entityId)
      ? current.filter((id) => id !== entityId)
      : [...current, entityId];
    updateTag(tagId, { targetEntityIds: next });
  };

  // Lazy-load locations from selected location map when needed
  useEffect(() => {
    const needsLocations = tags.some((t) => t.targetType === 'location');
    const mapId = locationsState?.mapId;

    if (!needsLocations || !mapId) {
      return;
    }

    // Only fetch once per map selection
    if (locationOptions.length > 0 && locationOptionsError === null) {
      return;
    }

    let cancelled = false;
    setLocationOptionsLoading(true);
    setLocationOptionsError(null);

    void fetch(`${API_BASE}/location-maps/${encodeURIComponent(mapId)}`)
      .then((res) => res.json() as Promise<unknown>)
      .then((raw) => {
        if (cancelled) return;
        const data = raw as { ok?: boolean; map?: { nodes?: unknown[] } };
        const nodes = data?.ok && data.map?.nodes ? data.map.nodes : [];
        const options = Array.isArray(nodes)
          ? nodes
              .map((n): LocationOption | null => {
                const node = n as { id?: unknown; name?: unknown; label?: unknown };
                const id = typeof node.id === 'string' ? node.id : undefined;
                const name =
                  typeof node.name === 'string'
                    ? node.name
                    : typeof node.label === 'string'
                      ? node.label
                      : undefined;
                return id && name ? { id, name } : null;
              })
              .filter(isLocationOption)
          : [];

        setLocationOptions(options);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[TagsStep] Failed to load location map nodes:', err);
        setLocationOptionsError('Failed to load locations for this map');
        setLocationOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLocationOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tags, locationsState?.mapId, locationOptions.length, locationOptionsError]);

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
            Available Tags ({visibleTags.length})
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
          ) : visibleTags.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tags available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {visibleTags.map((tag) => {
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
                        {/* Targeting config */}
                        {tag.targetType === 'character' && (
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">
                              Target Character(s)
                            </label>

                            {npcs.length === 0 ? (
                              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Add one or more NPCs to the session first.
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {npcs.map((npc: NpcSessionConfig) => {
                                  const checked =
                                    getTagConfig(tag.id)?.targetEntityIds?.includes(
                                      npc.characterId
                                    ) ?? false;
                                  return (
                                    <label
                                      key={npc.characterId}
                                      className="flex items-center gap-2 text-xs text-slate-300"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleTargetEntity(tag.id, npc.characterId)}
                                      />
                                      <span>{getCharacterName(npc.characterId)}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {npcs.length > 0 &&
                              (getTagConfig(tag.id)?.targetEntityIds?.length ?? 0) === 0 && (
                                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Select one or more characters for this tag.
                                </p>
                              )}
                          </div>
                        )}

                        {tag.targetType === 'location' && (
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">
                              Target Location(s)
                            </label>

                            {!locationsState?.mapId ? (
                              <div className="space-y-1">
                                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Select a location map first.
                                </p>
                                <button
                                  onClick={() => setStep('locations')}
                                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                                >
                                  Go to Locations step
                                </button>
                              </div>
                            ) : locationOptionsLoading ? (
                              <p className="text-xs text-slate-500">Loading locations…</p>
                            ) : locationOptionsError ? (
                              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {locationOptionsError}
                              </p>
                            ) : locationOptions.length === 0 ? (
                              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                No locations found in this map.
                              </p>
                            ) : (
                              <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-700 rounded p-2 bg-slate-900/20">
                                {locationOptions.map((loc) => {
                                  const checked =
                                    getTagConfig(tag.id)?.targetEntityIds?.includes(loc.id) ??
                                    false;
                                  return (
                                    <label
                                      key={loc.id}
                                      className="flex items-center gap-2 text-xs text-slate-300"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleTargetEntity(tag.id, loc.id)}
                                      />
                                      <span>{loc.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {locationsState?.mapId &&
                              locationOptions.length > 0 &&
                              (getTagConfig(tag.id)?.targetEntityIds?.length ?? 0) === 0 && (
                                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Select one or more locations for this tag.
                                </p>
                              )}
                          </div>
                        )}

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
                {tags.filter((t: TagSelection) => t.targetType === 'session').length} session,{' '}
                {tags.filter((t: TagSelection) => t.targetType === 'npc').length} all-NPC,{' '}
                {tags.filter((t: TagSelection) => t.targetType === 'character').length} character,{' '}
                {tags.filter((t: TagSelection) => t.targetType === 'location').length} location
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
                  ${tag.targetType === 'npc' || tag.targetType === 'character' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-violet-900/50 text-violet-300'}
                `}
              >
                <span>{tag.tagName ?? tag.tagId}</span>
                {tag.targetType === 'character' && (tag.targetEntityIds?.length ?? 0) > 0 && (
                  <span className="text-xs opacity-70">
                    ({(tag.targetEntityIds ?? []).map(getCharacterName).join(', ')})
                  </span>
                )}
                {tag.targetType === 'location' && (tag.targetEntityIds?.length ?? 0) > 0 && (
                  <span className="text-xs opacity-70">
                    ({tag.targetEntityIds?.length ?? 0} locations)
                  </span>
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
