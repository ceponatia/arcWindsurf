/**
 * Player Step - Configure player/persona for the session
 */

import React, { useState } from 'react';
import { useWorkspaceStore, usePlayerState } from '../store.js';
import type { PersonaSummary } from '../../../types.js';
import type { PersonaProfile } from '@minimal-rpg/schemas';

interface PlayerStepProps {
  personas: PersonaSummary[];
  loading: boolean;
  onRefresh: () => void;
  onNavigateToBuilder: () => void;
}

export const PlayerStep: React.FC<PlayerStepProps> = ({
  personas,
  loading,
  onRefresh,
  onNavigateToBuilder,
}) => {
  const playerState = usePlayerState();
  const { selectPersona, clearPersona, updatePlayer } = useWorkspaceStore();
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');

  const handleSelectPersona = (persona: PersonaSummary) => {
    // TODO: Fetch full persona profile from API
    const profile: PersonaProfile = {
      id: persona.id,
      name: persona.name,
      summary: persona.summary,
    };
    selectPersona(persona.id, profile);
  };

  const handleUseAnonymous = () => {
    // Create a temporary persona profile for anonymous play
    const anonymousProfile: PersonaProfile = {
      id: 'anonymous',
      name: quickCreateName.trim() || 'Player',
      summary: 'Anonymous player',
    };
    selectPersona('anonymous', anonymousProfile);
    setShowQuickCreate(false);
    setQuickCreateName('');
  };

  const getPersonaName = (): string => {
    return playerState.personaProfile?.name ?? 'Not selected';
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Configure Player</h2>
        <p className="text-sm text-slate-400 mt-1">
          Choose a persona or create a quick player identity for this session.
        </p>
      </div>

      {/* Current Selection */}
      {playerState.personaId && (
        <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-800/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-emerald-400">Current Player</p>
              <p className="font-medium text-slate-200">{getPersonaName()}</p>
              {playerState.personaId !== 'anonymous' && (
                <p className="text-xs text-slate-500">Using saved persona</p>
              )}
            </div>
            <button
              onClick={clearPersona}
              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
            >
              Clear
            </button>
          </div>

          {/* Player Configuration */}
          <div className="pt-3 border-t border-emerald-800/30 space-y-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Starting Location</label>
              <input
                type="text"
                value={playerState.startLocationId ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updatePlayer(value ? { startLocationId: value } : {});
                }}
                placeholder="Default starting location"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Selection Options */}
      {!playerState.personaId && (
        <div className="space-y-4">
          {/* Saved Personas */}
          <div className="border border-slate-800 rounded-lg bg-slate-900/30">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Saved Personas</span>
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

            <div className="p-4 max-h-64 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-slate-500 text-center py-4">Loading personas...</p>
              ) : personas.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No saved personas. Create one or use a quick option below.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {personas.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => handleSelectPersona(persona)}
                      className="text-left p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800 transition-all"
                    >
                      <p className="text-sm font-medium text-slate-200">{persona.name}</p>
                      {persona.bio && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-1">{persona.bio}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Anonymous Player */}
            <button
              onClick={handleUseAnonymous}
              className="p-4 rounded-lg border border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800 transition-all text-left"
            >
              <p className="text-sm font-medium text-slate-200">Play as "Player"</p>
              <p className="text-xs text-slate-500 mt-1">
                Use a generic identity without a detailed persona
              </p>
            </button>

            {/* Quick Create */}
            <button
              onClick={() => setShowQuickCreate(true)}
              className="p-4 rounded-lg border border-dashed border-slate-600 bg-slate-800/20 hover:border-violet-600 hover:bg-violet-950/20 transition-all text-left"
            >
              <p className="text-sm font-medium text-slate-200">Quick Create</p>
              <p className="text-xs text-slate-500 mt-1">
                Create a named player without full persona details
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Quick Create Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Quick Create Player</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Player Name</label>
                <input
                  type="text"
                  value={quickCreateName}
                  onChange={(e) => setQuickCreateName(e.target.value)}
                  placeholder="Enter a name..."
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleUseAnonymous()}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowQuickCreate(false);
                    setQuickCreateName('');
                  }}
                  className="px-4 py-2 text-sm rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUseAnonymous}
                  className="px-4 py-2 text-sm rounded bg-violet-600 text-white hover:bg-violet-500"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
