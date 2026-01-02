/**
 * NPCs Step - Select and configure NPC cast for the session
 */

import React, { useState } from 'react';
import { useWorkspaceStore, useNpcsState } from '../store.js';
import { SelectableCard } from '../components/SelectableCard.js';
import type { CharacterSummary } from '../../../types.js';
import type { NpcSessionConfig, NpcRole, NpcTier } from '../store.js';
import { Search, Filter, X } from 'lucide-react';

interface NpcsStepProps {
  characters: CharacterSummary[];
  loading: boolean;
  onRefresh: () => void;
  onNavigateToBuilder: () => void;
}

export const NpcsStep: React.FC<NpcsStepProps> = ({
  characters,
  loading,
  onRefresh,
  onNavigateToBuilder,
}) => {
  const npcs = useNpcsState();
  const { addNpc, removeNpc, updateNpc } = useWorkspaceStore();
  const [selectedForConfig, setSelectedForConfig] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArchetype, setFilterArchetype] = useState<string | null>(null);

  const selectedNpcIds = npcs.map((n: NpcSessionConfig) => n.characterId);

  // Get unique archetypes
  const archetypes = Array.from(
    new Set(characters.map((c) => c.archetype).filter(Boolean))
  ) as string[];

  // Filter characters
  const filteredCharacters = characters.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchetype = filterArchetype ? c.archetype === filterArchetype : true;
    return matchesSearch && matchesArchetype;
  });

  const handleAddNpc = (character: CharacterSummary) => {
    const config: NpcSessionConfig = {
      characterId: character.id,
      role: 'supporting',
      tier: 'minor',
    };
    addNpc(config);
  };

  const handleRemoveNpc = (characterId: string) => {
    removeNpc(characterId);
    if (selectedForConfig === characterId) {
      setSelectedForConfig(null);
    }
  };

  const selectedNpcConfig = selectedForConfig
    ? npcs.find((n: NpcSessionConfig) => n.characterId === selectedForConfig)
    : null;

  // Get character name from characters list
  const getCharacterName = (characterId: string): string => {
    const char = characters.find((c) => c.id === characterId);
    return char?.name ?? 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Select NPCs</h2>
        <p className="text-sm text-slate-400 mt-1">
          Choose which characters will appear in this session. Configure their starting state and
          role.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Characters */}
        <div className="border border-slate-800 rounded-lg bg-slate-900/30">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Available Characters</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={onNavigateToBuilder}
                className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
              >
                + Create New
              </button>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search characters..."
                className="w-full pl-8 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-violet-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {archetypes.length > 0 && (
              <div className="relative">
                <select
                  value={filterArchetype ?? ''}
                  onChange={(e) => setFilterArchetype(e.target.value || null)}
                  className="pl-2 pr-6 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 focus:ring-1 focus:ring-violet-500 appearance-none"
                >
                  <option value="">All Types</option>
                  {archetypes.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
            )}
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-500 text-center py-8">Loading characters...</p>
            ) : characters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 mb-3">No characters available</p>
                <button
                  onClick={onNavigateToBuilder}
                  className="text-sm px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-500"
                >
                  Create Your First Character
                </button>
              </div>
            ) : filteredCharacters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 mb-2">No characters match your search</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterArchetype(null);
                  }}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCharacters.map((character) => {
                  const isSelected = selectedNpcIds.includes(character.id);
                  return (
                    <SelectableCard
                      key={character.id}
                      title={character.name}
                      subtitle={character.archetype}
                      selected={isSelected}
                      className="p-3"
                      actions={
                        <button
                          onClick={() =>
                            isSelected ? handleRemoveNpc(character.id) : handleAddNpc(character)
                          }
                          className={`
                            text-xs px-3 py-1.5 rounded transition-colors
                            ${
                              isSelected
                                ? 'bg-slate-700 text-slate-400 hover:bg-red-900/50 hover:text-red-400'
                                : 'bg-violet-600 text-white hover:bg-violet-500'
                            }
                          `}
                        >
                          {isSelected ? 'Remove' : 'Add'}
                        </button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected NPCs & Configuration */}
        <div className="border border-slate-800 rounded-lg bg-slate-900/30">
          <div className="px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-medium text-slate-300">Session Cast ({npcs.length})</span>
          </div>

          <div className="p-4">
            {npcs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No NPCs selected. Add characters from the list.
              </p>
            ) : (
              <div className="space-y-2">
                {npcs.map((npc: NpcSessionConfig) => (
                  <SelectableCard
                    key={npc.characterId}
                    title={getCharacterName(npc.characterId)}
                    selected={selectedForConfig === npc.characterId}
                    onClick={() =>
                      setSelectedForConfig(
                        selectedForConfig === npc.characterId ? null : npc.characterId
                      )
                    }
                    badges={
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                        {npc.role}
                      </span>
                    }
                    actions={
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveNpc(npc.characterId);
                        }}
                        className="text-xs text-slate-500 hover:text-red-400 p-1"
                      >
                        ✕
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NPC Configuration Panel */}
      {selectedNpcConfig && (
        <div className="border border-slate-800 rounded-lg bg-slate-900/30 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4">
            Configure: {getCharacterName(selectedNpcConfig.characterId)}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Role</label>
              <select
                value={selectedNpcConfig.role}
                onChange={(e) =>
                  updateNpc(selectedNpcConfig.characterId, {
                    role: e.target.value as NpcRole,
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
              >
                <option value="primary">Primary (Main character)</option>
                <option value="supporting">Supporting (Secondary)</option>
                <option value="background">Background (World flavor)</option>
                <option value="antagonist">Antagonist</option>
              </select>
            </div>

            {/* Tier Selection */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tier</label>
              <select
                value={selectedNpcConfig.tier}
                onChange={(e) =>
                  updateNpc(selectedNpcConfig.characterId, {
                    tier: e.target.value as NpcTier,
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
              >
                <option value="major">Major (Full detail)</option>
                <option value="minor">Minor (Partial detail)</option>
                <option value="transient">Transient (Minimal detail)</option>
              </select>
            </div>

            {/* Starting Location */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Starting Location</label>
              <input
                type="text"
                value={selectedNpcConfig.startLocationId ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateNpc(selectedNpcConfig.characterId, value ? { startLocationId: value } : {});
                }}
                placeholder="Default location"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500"
              />
            </div>

            {/* Label */}
            <div className="md:col-span-3">
              <label className="block text-sm text-slate-400 mb-1">Label</label>
              <input
                type="text"
                value={selectedNpcConfig.label ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateNpc(selectedNpcConfig.characterId, value ? { label: value } : {});
                }}
                placeholder="Custom label for this session..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {npcs.length > 0 && (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{npcs.length} NPCs selected</span>
            <span className="text-slate-500">
              {npcs.filter((n: NpcSessionConfig) => n.role === 'primary').length} primary,{' '}
              {npcs.filter((n: NpcSessionConfig) => n.role === 'supporting').length} supporting,{' '}
              {npcs.filter((n: NpcSessionConfig) => n.role === 'background').length} background,{' '}
              {npcs.filter((n: NpcSessionConfig) => n.role === 'antagonist').length} antagonist
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
