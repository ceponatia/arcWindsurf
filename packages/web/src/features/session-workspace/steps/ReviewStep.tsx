/**
 * Review Step - Final review and launch session
 */

import React, { useMemo } from 'react';
import {
  useWorkspaceStore,
  useSettingState,
  useNpcsState,
  usePlayerState,
  useTagsState,
  useValidation,
} from '../store.js';
import type { NpcSessionConfig, TagSelection, StepValidationState } from '../store.js';
import type { CharacterSummary } from '../../../types.js';

interface ReviewStepProps {
  characters: CharacterSummary[];
  onLaunch: () => Promise<void>;
  launching: boolean;
  error?: string | null;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  characters,
  onLaunch,
  launching,
  error,
}) => {
  const settingState = useSettingState();
  const npcs = useNpcsState();
  const playerState = usePlayerState();
  const tags = useTagsState();
  const validation = useValidation();
  const { setStep } = useWorkspaceStore();

  // Get character name from characters list
  const getCharacterName = (characterId: string): string => {
    const char = characters.find((c) => c.id === characterId);
    return char?.name ?? 'Unknown';
  };

  const summary = useMemo(() => {
    return {
      setting: settingState.settingProfile?.name ?? 'Not selected',
      settingId: settingState.settingId,
      npcCount: npcs.length,
      npcs: npcs,
      player: playerState.personaProfile?.name ?? 'Not configured',
      playerId: playerState.personaId,
      tagCount: tags.length,
      tags: tags,
      timeConfig: settingState.startTime
        ? `${settingState.startTime.hour.toString().padStart(2, '0')}:${settingState.startTime.minute.toString().padStart(2, '0')}`
        : '09:00',
      secondsPerTurn: settingState.secondsPerTurn ?? 60,
    };
  }, [settingState, npcs, playerState, tags]);

  const canLaunch = validation.isValid && !launching;

  // Flatten validation errors for display
  const validationErrors = useMemo(() => {
    const errors: { message: string; step?: string }[] = [];
    for (const [step, state] of Object.entries(validation.stepErrors) as [string, StepValidationState | undefined][]) {
      if (state && !state.valid) {
        for (const err of state.errors) {
          errors.push({ message: err, step });
        }
      }
    }
    return errors;
  }, [validation]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Review & Launch</h2>
        <p className="text-sm text-slate-400 mt-1">
          Review your session configuration before starting.
        </p>
      </div>

      {/* Validation Status */}
      {!validation.isValid && validationErrors.length > 0 && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800/50">
          <p className="text-sm font-medium text-red-400 mb-2">Please fix the following issues:</p>
          <ul className="space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx} className="text-sm text-red-300 flex items-center gap-2">
                <span className="text-red-500">•</span>
                {err.message}
                {err.step && (
                  <button
                    onClick={() => setStep(err.step as any)}
                    className="text-xs underline text-red-400 hover:text-red-300"
                  >
                    Fix →
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Setting Card */}
        <div
          className={`
            p-4 rounded-lg border cursor-pointer transition-all
            ${
              summary.settingId
                ? 'border-emerald-700/50 bg-emerald-900/20'
                : 'border-red-700/50 bg-red-900/20'
            }
          `}
          onClick={() => setStep('setting')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Setting</span>
            <span
              className={`w-2 h-2 rounded-full ${summary.settingId ? 'bg-emerald-500' : 'bg-red-500'}`}
            />
          </div>
          <p className="font-medium text-slate-200">{summary.setting}</p>
          <p className="text-xs text-slate-500 mt-1">
            Starting at {summary.timeConfig} • {summary.secondsPerTurn}s/turn
          </p>
        </div>

        {/* NPCs Card */}
        <div
          className={`
            p-4 rounded-lg border cursor-pointer transition-all
            ${
              npcs.length > 0
                ? 'border-emerald-700/50 bg-emerald-900/20'
                : 'border-red-700/50 bg-red-900/20'
            }
          `}
          onClick={() => setStep('npcs')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">NPCs</span>
            <span
              className={`w-2 h-2 rounded-full ${npcs.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
            />
          </div>
          <p className="font-medium text-slate-200">{summary.npcCount} characters</p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.npcs
              .slice(0, 3)
              .map((n: NpcSessionConfig) => getCharacterName(n.characterId))
              .join(', ')}
            {summary.npcs.length > 3 && ` +${summary.npcs.length - 3} more`}
          </p>
        </div>

        {/* Player Card */}
        <div
          className={`
            p-4 rounded-lg border cursor-pointer transition-all
            ${
              playerState.personaId
                ? 'border-emerald-700/50 bg-emerald-900/20'
                : 'border-slate-700/50 bg-slate-800/30'
            }
          `}
          onClick={() => setStep('player')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Player</span>
            <span
              className={`w-2 h-2 rounded-full ${playerState.personaId ? 'bg-emerald-500' : 'bg-slate-500'}`}
            />
          </div>
          <p className="font-medium text-slate-200">{summary.player}</p>
          <p className="text-xs text-slate-500 mt-1">
            {playerState.personaId && playerState.personaId !== 'anonymous'
              ? 'Saved persona'
              : playerState.personaId === 'anonymous'
                ? 'Quick player'
                : 'Not selected'}
          </p>
        </div>

        {/* Tags Card */}
        <div
          className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30 cursor-pointer transition-all hover:border-slate-600"
          onClick={() => setStep('tags')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Tags</span>
            <span className="w-2 h-2 rounded-full bg-slate-500" />
          </div>
          <p className="font-medium text-slate-200">{summary.tagCount} tags</p>
          {summary.tags.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              {summary.tags
                .slice(0, 3)
                .map((t: TagSelection) => t.tagName ?? t.tagId)
                .join(', ')}
              {summary.tags.length > 3 && ` +${summary.tags.length - 3} more`}
            </p>
          )}
        </div>
      </div>

      {/* NPC Detail List */}
      {npcs.length > 0 && (
        <div className="border border-slate-800 rounded-lg bg-slate-900/30">
          <div className="px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-medium text-slate-300">NPC Configuration</span>
          </div>
          <div className="divide-y divide-slate-800">
            {npcs.map((npc: NpcSessionConfig) => (
              <div key={npc.characterId} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {getCharacterName(npc.characterId)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {npc.role} • {npc.tier}
                    </p>
                  </div>
                </div>
                {npc.label && (
                  <span className="text-xs text-slate-500 max-w-xs truncate">{npc.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-800">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Launch Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => setStep('setting')}
          className="px-6 py-3 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        >
          ← Back to Edit
        </button>
        <button
          onClick={() => void onLaunch()}
          disabled={!canLaunch}
          className={`
            px-8 py-3 text-sm font-medium rounded-lg transition-all
            ${
              canLaunch
                ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/25'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          {launching ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Creating Session...
            </span>
          ) : (
            'Launch Session →'
          )}
        </button>
      </div>

      {/* Validation Summary */}
      {validation.isValid && (
        <div className="text-center py-4">
          <p className="text-sm text-emerald-400">✓ All required fields configured</p>
        </div>
      )}
    </div>
  );
};
