/**
 * Session Workspace - Main session creation interface
 *
 * Unified experience for configuring a new game session with:
 * - Setting selection
 * - NPC cast configuration
 * - Player/Persona setup
 * - Tags/Rules configuration
 * - Review & Launch
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  useWorkspaceStore,
  useCurrentStep,
  useWorkspaceMode,
  useValidation,
  useSettingState,
  useNpcsState,
  usePlayerState,
  useTagsState,
} from './store.js';
import type { WorkspaceStep, NpcSessionConfig, TagSelection, RelationshipConfig } from './store.js';
import { SettingStep } from './steps/SettingStep.js';
import { NpcsStep } from './steps/NpcsStep.js';
import { PlayerStep } from './steps/PlayerStep.js';
import { TagsStep } from './steps/TagsStep.js';
import { ReviewStep } from './steps/ReviewStep.js';
import { CompactBuilder } from './CompactBuilder.js';
import type { CharacterSummary, SettingSummary, PersonaSummary, TagSummary } from '../../types.js';

// ============================================================================
// Types
// ============================================================================

interface SessionWorkspaceProps {
  settings: SettingSummary[];
  settingsLoading: boolean;
  characters: CharacterSummary[];
  charactersLoading: boolean;
  personas: PersonaSummary[];
  personasLoading: boolean;
  tags: TagSummary[];
  tagsLoading: boolean;
  onRefreshSettings: () => void;
  onRefreshCharacters: () => void;
  onRefreshPersonas: () => void;
  onRefreshTags: () => void;
  onNavigateToSettingBuilder: () => void;
  onNavigateToCharacterBuilder: () => void;
  onNavigateToPersonaBuilder: () => void;
  onCreateSession: (config: SessionCreateConfig) => Promise<string>;
  onSessionCreated: (sessionId: string) => void;
}

export interface SessionCreateConfig {
  settingId: string;
  personaId?: string;
  startLocationId?: string;
  startTime?: {
    hour: number;
    minute: number;
  };
  secondsPerTurn?: number;
  npcs: {
    characterId: string;
    role: string;
    tier: string;
    startLocationId?: string;
    label?: string;
  }[];
  tags: {
    tagId: string;
    scope: string;
    targetId?: string;
  }[];
  relationships: {
    fromActorId: string;
    toActorId: string;
    relationshipType: string;
    affinitySeed?: {
      trust?: number;
      fondness?: number;
      fear?: number;
    };
  }[];
}

// ============================================================================
// Step Navigation
// ============================================================================

interface StepNavProps {
  steps: { id: WorkspaceStep; label: string; required?: boolean }[];
  currentStep: WorkspaceStep;
  onStepClick: (step: WorkspaceStep) => void;
  validation: ReturnType<typeof useValidation>;
}

const StepNavigation: React.FC<StepNavProps> = ({
  steps,
  currentStep,
  onStepClick,
  validation,
}) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800 overflow-x-auto">
      {steps.map((step, index) => {
        const stepValidation = validation.stepErrors[step.id];
        const isValid = stepValidation?.valid ?? true;
        const isCurrent = step.id === currentStep;
        const isPast = index < currentIndex;

        return (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${isCurrent ? 'bg-violet-600 text-white' : ''}
              ${isPast && isValid ? 'text-emerald-400 hover:bg-slate-800' : ''}
              ${isPast && !isValid ? 'text-amber-400 hover:bg-slate-800' : ''}
              ${!isCurrent && !isPast ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : ''}
            `}
          >
            <span
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${isCurrent ? 'bg-white/20' : ''}
                ${isPast && isValid ? 'bg-emerald-900/50' : ''}
                ${isPast && !isValid ? 'bg-amber-900/50' : ''}
                ${!isCurrent && !isPast ? 'bg-slate-700' : ''}
              `}
            >
              {isPast && isValid ? '✓' : isPast && !isValid ? '!' : index + 1}
            </span>
            <span>{step.label}</span>
            {step.required && !isValid && <span className="text-red-400 text-xs">*</span>}
          </button>
        );
      })}
    </nav>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const STEPS: { id: WorkspaceStep; label: string; required?: boolean }[] = [
  { id: 'setting', label: 'Setting', required: true },
  { id: 'npcs', label: 'NPCs', required: true },
  { id: 'player', label: 'Player' },
  { id: 'tags', label: 'Tags' },
  { id: 'review', label: 'Review' },
];

export const SessionWorkspace: React.FC<SessionWorkspaceProps> = ({
  settings,
  settingsLoading,
  characters,
  charactersLoading,
  personas,
  personasLoading,
  tags,
  tagsLoading,
  onRefreshSettings,
  onRefreshCharacters,
  onRefreshPersonas,
  onRefreshTags,
  onNavigateToSettingBuilder,
  onNavigateToCharacterBuilder,
  onNavigateToPersonaBuilder,
  onCreateSession,
  onSessionCreated,
}) => {
  const currentStep = useCurrentStep();
  const mode = useWorkspaceMode();
  const validation = useValidation();
  const settingState = useSettingState();
  const npcs = useNpcsState();
  const playerState = usePlayerState();
  const selectedTags = useTagsState();
  const { setStep, setMode, reset } = useWorkspaceStore();
  const relationships = useWorkspaceStore((s) => s.relationships);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Auto-save draft effect
  useEffect(() => {
    // TODO: Implement auto-save to server
  }, [settingState, npcs, playerState, selectedTags]);

  const handleStepClick = useCallback(
    (step: WorkspaceStep) => {
      setStep(step);
    },
    [setStep]
  );

  const handleNextStep = useCallback(() => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    const nextStep = STEPS[currentIndex + 1];
    if (currentIndex < STEPS.length - 1 && nextStep) {
      setStep(nextStep.id);
    }
  }, [currentStep, setStep]);

  const handlePrevStep = useCallback(() => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    const prevStep = STEPS[currentIndex - 1];
    if (currentIndex > 0 && prevStep) {
      setStep(prevStep.id);
    }
  }, [currentStep, setStep]);

  const handleCreateSession = useCallback(async () => {
    if (!validation.isValid) {
      setCreateError('Please fix validation errors before creating session');
      return;
    }

    if (!settingState.settingId) {
      setCreateError('Please select a setting');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      // Build config with conditional optional properties
      const config: SessionCreateConfig = {
        settingId: settingState.settingId,
        npcs: npcs.map((n: NpcSessionConfig) => {
          const npcConfig: SessionCreateConfig['npcs'][number] = {
            characterId: n.characterId,
            role: n.role as string,
            tier: n.tier as string,
          };
          if (n.startLocationId) npcConfig.startLocationId = n.startLocationId;
          if (n.label) npcConfig.label = n.label;
          return npcConfig;
        }),
        tags: selectedTags.map((t: TagSelection) => {
          const tagConfig: SessionCreateConfig['tags'][number] = {
            tagId: t.tagId,
            scope: t.scope as string,
          };
          if (t.targetId) tagConfig.targetId = t.targetId;
          return tagConfig;
        }),
        relationships: relationships.map((r: RelationshipConfig) => {
          const relConfig: SessionCreateConfig['relationships'][number] = {
            fromActorId: r.fromActorId,
            toActorId: r.toActorId,
            relationshipType: r.relationshipType,
          };
          if (r.affinitySeed) relConfig.affinitySeed = r.affinitySeed;
          return relConfig;
        }),
      };

      // Add optional fields only if defined
      if (playerState.personaId) config.personaId = playerState.personaId;
      if (playerState.startLocationId) config.startLocationId = playerState.startLocationId;
      if (settingState.startTime) {
        config.startTime = {
          hour: settingState.startTime.hour,
          minute: settingState.startTime.minute,
        };
      }
      if (settingState.secondsPerTurn !== undefined) {
        config.secondsPerTurn = settingState.secondsPerTurn;
      }

      const sessionId = await onCreateSession(config);
      reset();
      onSessionCreated(sessionId);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }, [
    validation.isValid,
    settingState,
    playerState,
    npcs,
    selectedTags,
    relationships,
    onCreateSession,
    onSessionCreated,
    reset,
  ]);

  const renderStep = () => {
    switch (currentStep) {
      case 'setting':
        return (
          <SettingStep
            settings={settings}
            loading={settingsLoading}
            onRefresh={onRefreshSettings}
            onNavigateToBuilder={onNavigateToSettingBuilder}
          />
        );
      case 'npcs':
        return (
          <NpcsStep
            characters={characters}
            loading={charactersLoading}
            onRefresh={onRefreshCharacters}
            onNavigateToBuilder={onNavigateToCharacterBuilder}
          />
        );
      case 'player':
        return (
          <PlayerStep
            personas={personas}
            loading={personasLoading}
            onRefresh={onRefreshPersonas}
            onNavigateToBuilder={onNavigateToPersonaBuilder}
          />
        );
      case 'tags':
        return (
          <TagsStep
            availableTags={tags}
            characters={characters}
            loading={tagsLoading}
            onRefresh={onRefreshTags}
          />
        );
      case 'review':
        return (
          <ReviewStep
            characters={characters}
            onLaunch={handleCreateSession}
            launching={creating}
            error={createError}
          />
        );
      default:
        return null;
    }
  };

  // Compact mode
  if (mode === 'compact') {
    return (
      <div className="p-6 bg-slate-900 min-h-full">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setMode('wizard')}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Switch to Wizard Mode
          </button>
        </div>
        <CompactBuilder
          settings={settings}
          characters={characters}
          personas={personas}
          tags={tags}
          loading={settingsLoading || charactersLoading || personasLoading || tagsLoading}
          onLaunch={handleCreateSession}
          launching={creating}
          error={createError}
        />
      </div>
    );
  }

  // Wizard mode
  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-100">New Session</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode('compact')}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Compact Mode
          </button>
          <button
            onClick={reset}
            className="text-xs px-3 py-1.5 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Step Navigation */}
      <StepNavigation
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        validation={validation}
      />

      {/* Step Content */}
      <div className="mb-6">{renderStep()}</div>

      {/* Footer Navigation */}
      {currentStep !== 'review' && (
        <div className="flex justify-between pt-4 border-t border-slate-800">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 'setting'}
            className={`
              px-4 py-2 rounded text-sm transition-colors
              ${
                currentStep === 'setting'
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }
            `}
          >
            ← Previous
          </button>
          <button
            onClick={handleNextStep}
            className="px-4 py-2 rounded text-sm bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
