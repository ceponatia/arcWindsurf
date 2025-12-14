/**
 * Session Workspace Zustand Store
 *
 * Manages state for the multi-step session creation workflow.
 * Supports:
 * - Non-linear step navigation
 * - Auto-save to localStorage + server sync
 * - Per-step validation
 * - Draft persistence
 */

import { useMemo, useEffect } from 'react';
import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import type { CharacterProfile, SettingProfile, PersonaProfile } from '@minimal-rpg/schemas';
import {
  createWorkspaceDraft,
  updateWorkspaceDraft,
  deleteWorkspaceDraft as apiDeleteWorkspaceDraft,
  getWorkspaceModePreference,
  setWorkspaceModePreference,
} from '../../shared/api/client.js';

// ============================================================================
// Types
// ============================================================================

export type WorkspaceStep = 'setting' | 'locations' | 'npcs' | 'player' | 'tags' | 'review';

export interface SettingWorkspaceState {
  settingId: string | null;
  settingProfile: SettingProfile | null;
  startTime?: {
    year?: number;
    month?: number;
    day?: number;
    hour: number;
    minute: number;
  };
  secondsPerTurn?: number;
}

export interface LocationMapState {
  mapId: string | null;
  mapName?: string;
  startLocationId: string | null;
}

export type NpcRole = 'primary' | 'supporting' | 'background' | 'antagonist';
export type NpcTier = 'major' | 'minor' | 'transient';

export interface NpcSessionConfig {
  characterId: string;
  characterProfile?: CharacterProfile;
  role: NpcRole;
  tier: NpcTier;
  startLocationId?: string;
  label?: string;
}

export interface PlayerSessionConfig {
  personaId: string | null;
  personaProfile?: PersonaProfile;
  startLocationId?: string;
}

export interface TagSelection {
  tagId: string;
  tagName?: string;
  scope: 'session' | 'npc';
  targetId?: string; // Required if scope is 'npc'
}

export interface RelationshipConfig {
  fromActorId: string;
  toActorId: string;
  relationshipType: string;
  affinitySeed?: {
    trust?: number;
    fondness?: number;
    fear?: number;
  };
}

export interface StepValidationState {
  valid: boolean;
  errors: string[];
}

export interface ValidationResult {
  isValid: boolean;
  stepErrors: Partial<Record<WorkspaceStep, StepValidationState>>;
}

export interface WorkspaceState {
  // Navigation
  currentStep: WorkspaceStep;
  completedSteps: Set<WorkspaceStep>;

  // Step Data
  setting: SettingWorkspaceState;
  locations: LocationMapState;
  npcs: NpcSessionConfig[];
  player: PlayerSessionConfig;
  tags: TagSelection[];
  relationships: RelationshipConfig[];

  // Persistence
  draftId: string | null;
  isDirty: boolean;
  lastSavedAt: number | null;
  isSaving: boolean;

  // UI mode
  mode: 'wizard' | 'compact';
}

export interface WorkspaceActions {
  // Navigation
  setStep: (step: WorkspaceStep) => void;
  markStepComplete: (step: WorkspaceStep) => void;

  // Setting
  updateSetting: (partial: Partial<SettingWorkspaceState>) => void;
  selectSetting: (settingId: string, profile: SettingProfile) => void;
  clearSetting: () => void;

  // Locations
  updateLocations: (partial: Partial<LocationMapState>) => void;
  setLocations: (locations: LocationMapState | null) => void;

  // NPCs
  addNpc: (npc: NpcSessionConfig) => void;
  updateNpc: (characterId: string, partial: Partial<NpcSessionConfig>) => void;
  removeNpc: (characterId: string) => void;
  clearNpcs: () => void;

  // Player
  updatePlayer: (partial: Partial<PlayerSessionConfig>) => void;
  selectPersona: (personaId: string, profile: PersonaProfile) => void;
  clearPersona: () => void;

  // Tags
  addTag: (tag: TagSelection) => void;
  updateTag: (tagId: string, partial: Partial<TagSelection>) => void;
  removeTag: (tagId: string, targetId?: string) => void;
  clearTags: () => void;

  // Relationships
  addRelationship: (rel: RelationshipConfig) => void;
  updateRelationship: (
    fromActorId: string,
    toActorId: string,
    partial: Partial<RelationshipConfig>
  ) => void;
  removeRelationship: (fromActorId: string, toActorId: string) => void;

  // Persistence
  setDraftId: (id: string | null) => void;
  markDirty: () => void;
  markSaved: () => void;
  setIsSaving: (saving: boolean) => void;
  saveDraftToServer: () => Promise<void>;
  deleteDraftFromServer: () => Promise<void>;

  // Mode
  setMode: (mode: 'wizard' | 'compact') => void;

  // Validation
  validate: () => ValidationResult;
  validateStep: (step: WorkspaceStep) => StepValidationState;

  // Reset
  reset: () => void;
  loadFromDraft: (draft: Partial<WorkspaceState>) => void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: WorkspaceState = {
  currentStep: 'setting',
  completedSteps: new Set<WorkspaceStep>(),
  setting: {
    settingId: null,
    settingProfile: null,
  },
  locations: {
    mapId: null,
    startLocationId: null,
  },
  npcs: [],
  player: {
    personaId: null,
  },
  tags: [],
  relationships: [],
  draftId: null,
  isDirty: false,
  lastSavedAt: null,
  isSaving: false,
  mode: 'wizard',
};

// ============================================================================
// Validation Functions
// ============================================================================

function validateSettingStep(state: WorkspaceState): StepValidationState {
  const errors: string[] = [];
  if (!state.setting.settingId) {
    errors.push('Please select a setting');
  }
  return { valid: errors.length === 0, errors };
}

function validateLocationsStep(_state: WorkspaceState): StepValidationState {
  // Locations are optional in MVP
  return { valid: true, errors: [] };
}

function validateNpcsStep(state: WorkspaceState): StepValidationState {
  const errors: string[] = [];
  if (state.npcs.length === 0) {
    errors.push('Please add at least one NPC to the session');
  }
  return { valid: errors.length === 0, errors };
}

function validatePlayerStep(_state: WorkspaceState): StepValidationState {
  // Player/Persona is optional
  return { valid: true, errors: [] };
}

function validateTagsStep(_state: WorkspaceState): StepValidationState {
  // Tags are optional
  return { valid: true, errors: [] };
}

function validateReviewStep(state: WorkspaceState): StepValidationState {
  // Review step is valid if setting and NPCs are valid
  const settingValid = validateSettingStep(state);
  const npcsValid = validateNpcsStep(state);

  const errors: string[] = [];
  if (!settingValid.valid) {
    errors.push('Setting step is incomplete');
  }
  if (!npcsValid.valid) {
    errors.push('NPCs step is incomplete');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Store Creation
// ============================================================================

export const useWorkspaceStore = create<WorkspaceStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        (set, get) => ({
          ...initialState,

          // Navigation
          setStep: (step) => set({ currentStep: step }, false, 'setStep'),
          markStepComplete: (step) =>
            set(
              (state) => ({
                completedSteps: new Set([...state.completedSteps, step]),
              }),
              false,
              'markStepComplete'
            ),

          // Setting
          updateSetting: (partial) =>
            set(
              (state) => ({
                setting: { ...state.setting, ...partial },
                isDirty: true,
              }),
              false,
              'updateSetting'
            ),
          selectSetting: (settingId, profile) =>
            set(
              (state) => ({
                setting: { ...state.setting, settingId, settingProfile: profile },
                isDirty: true,
              }),
              false,
              'selectSetting'
            ),
          clearSetting: () =>
            set(
              () => ({
                setting: { settingId: null, settingProfile: null },
                isDirty: true,
              }),
              false,
              'clearSetting'
            ),

          // Locations
          updateLocations: (partial) =>
            set(
              (state) => ({
                locations: { ...state.locations, ...partial },
                isDirty: true,
              }),
              false,
              'updateLocations'
            ),
          setLocations: (locations) =>
            set(
              () => ({
                locations: locations ?? { mapId: null, startLocationId: null },
                isDirty: true,
              }),
              false,
              'setLocations'
            ),

          // NPCs
          addNpc: (npc) =>
            set(
              (state) => ({
                npcs: [...state.npcs, npc],
                isDirty: true,
              }),
              false,
              'addNpc'
            ),
          updateNpc: (characterId, partial) =>
            set(
              (state) => ({
                npcs: state.npcs.map((n) =>
                  n.characterId === characterId ? { ...n, ...partial } : n
                ),
                isDirty: true,
              }),
              false,
              'updateNpc'
            ),
          removeNpc: (characterId) =>
            set(
              (state) => ({
                npcs: state.npcs.filter((n) => n.characterId !== characterId),
                isDirty: true,
              }),
              false,
              'removeNpc'
            ),
          clearNpcs: () => set(() => ({ npcs: [], isDirty: true }), false, 'clearNpcs'),

          // Player
          updatePlayer: (partial) =>
            set(
              (state) => ({
                player: { ...state.player, ...partial },
                isDirty: true,
              }),
              false,
              'updatePlayer'
            ),
          selectPersona: (personaId, profile) =>
            set(
              (state) => ({
                player: { ...state.player, personaId, personaProfile: profile },
                isDirty: true,
              }),
              false,
              'selectPersona'
            ),
          clearPersona: () =>
            set(
              (state) => {
                // Destructure to omit personaProfile
                const { personaProfile: _, ...rest } = state.player;
                return {
                  player: { ...rest, personaId: null },
                  isDirty: true,
                };
              },
              false,
              'clearPersona'
            ),

          // Tags
          addTag: (tag) =>
            set(
              (state) => ({
                tags: [...state.tags, tag],
                isDirty: true,
              }),
              false,
              'addTag'
            ),
          updateTag: (tagId, partial) =>
            set(
              (state) => ({
                tags: state.tags.map((t) => (t.tagId === tagId ? { ...t, ...partial } : t)),
                isDirty: true,
              }),
              false,
              'updateTag'
            ),
          removeTag: (tagId, targetId) =>
            set(
              (state) => ({
                tags: state.tags.filter(
                  (t) => !(t.tagId === tagId && (targetId === undefined || t.targetId === targetId))
                ),
                isDirty: true,
              }),
              false,
              'removeTag'
            ),
          clearTags: () => set(() => ({ tags: [], isDirty: true }), false, 'clearTags'),

          // Relationships
          addRelationship: (rel) =>
            set(
              (state) => ({
                relationships: [...state.relationships, rel],
                isDirty: true,
              }),
              false,
              'addRelationship'
            ),
          updateRelationship: (fromActorId, toActorId, partial) =>
            set(
              (state) => ({
                relationships: state.relationships.map((r) =>
                  r.fromActorId === fromActorId && r.toActorId === toActorId
                    ? { ...r, ...partial }
                    : r
                ),
                isDirty: true,
              }),
              false,
              'updateRelationship'
            ),
          removeRelationship: (fromActorId, toActorId) =>
            set(
              (state) => ({
                relationships: state.relationships.filter(
                  (r) => !(r.fromActorId === fromActorId && r.toActorId === toActorId)
                ),
                isDirty: true,
              }),
              false,
              'removeRelationship'
            ),

          // Persistence
          setDraftId: (id) => set({ draftId: id }, false, 'setDraftId'),
          markDirty: () => set({ isDirty: true }, false, 'markDirty'),
          markSaved: () => set({ isDirty: false, lastSavedAt: Date.now() }, false, 'markSaved'),
          setIsSaving: (saving) => set({ isSaving: saving }, false, 'setIsSaving'),

          /**
           * Save the current workspace state to the server.
           * Creates a new draft if none exists, otherwise updates.
           */
          saveDraftToServer: async () => {
            const state = get();
            if (state.isSaving) return; // Already saving

            set({ isSaving: true }, false, 'saveDraftToServer:start');

            try {
              // Serialize state for API
              const workspaceState: Record<string, unknown> = {
                setting: state.setting,
                locations: state.locations,
                npcs: state.npcs,
                player: state.player,
                tags: state.tags,
                relationships: state.relationships,
                completedSteps: Array.from(state.completedSteps),
                mode: state.mode,
              };

              if (state.draftId) {
                // Update existing draft
                await updateWorkspaceDraft(state.draftId, {
                  workspaceState,
                  currentStep: state.currentStep,
                });
                console.log('[Workspace] Draft updated:', state.draftId);
              } else {
                // Create new draft
                const draft = await createWorkspaceDraft({
                  workspaceState,
                  currentStep: state.currentStep,
                });
                set({ draftId: draft.id }, false, 'saveDraftToServer:created');
                console.log('[Workspace] Draft created:', draft.id);
              }

              set({ isDirty: false, lastSavedAt: Date.now() }, false, 'saveDraftToServer:done');
            } catch (err) {
              console.error('[Workspace] Failed to save draft to server:', err);
              // Don't throw - just log. Next save attempt will retry
            } finally {
              set({ isSaving: false }, false, 'saveDraftToServer:end');
            }
          },

          /**
           * Delete the current draft from the server (after session creation or reset).
           */
          deleteDraftFromServer: async () => {
            const state = get();
            if (!state.draftId) return;

            try {
              await apiDeleteWorkspaceDraft(state.draftId);
              console.log('[Workspace] Draft deleted:', state.draftId);
              set({ draftId: null }, false, 'deleteDraftFromServer');
            } catch (err) {
              console.error('[Workspace] Failed to delete draft:', err);
            }
          },

          // Mode
          setMode: (mode) => {
            set({ mode }, false, 'setMode');
            // Persist to server (fire and forget)
            void setWorkspaceModePreference(mode).catch((err) => {
              console.warn('[Workspace] Failed to persist mode preference:', err);
            });
          },

          // Validation
          validateStep: (step) => {
            const state = get();
            switch (step) {
              case 'setting':
                return validateSettingStep(state);
              case 'locations':
                return validateLocationsStep(state);
              case 'npcs':
                return validateNpcsStep(state);
              case 'player':
                return validatePlayerStep(state);
              case 'tags':
                return validateTagsStep(state);
              case 'review':
                return validateReviewStep(state);
              default:
                return { valid: true, errors: [] };
            }
          },
          validate: () => {
            const state = get();
            const steps: WorkspaceStep[] = [
              'setting',
              'locations',
              'npcs',
              'player',
              'tags',
              'review',
            ];
            const stepErrors: Partial<Record<WorkspaceStep, StepValidationState>> = {};
            let isValid = true;

            for (const step of steps) {
              const validation = get().validateStep(step);
              stepErrors[step] = validation;
              if (!validation.valid && (step === 'setting' || step === 'npcs')) {
                isValid = false;
              }
            }

            return { isValid, stepErrors };
          },

          // Reset
          reset: () => set({ ...initialState, completedSteps: new Set() }, false, 'reset'),
          loadFromDraft: (draft) =>
            set(
              (state) => ({
                ...state,
                ...draft,
                completedSteps: draft.completedSteps
                  ? new Set(draft.completedSteps)
                  : state.completedSteps,
                isDirty: false,
              }),
              false,
              'loadFromDraft'
            ),
        }),
        {
          name: 'session-workspace',
          // Only persist essential state, not UI state
          partialize: (state) => ({
            setting: state.setting,
            locations: state.locations,
            npcs: state.npcs,
            player: state.player,
            tags: state.tags,
            relationships: state.relationships,
            draftId: state.draftId,
            currentStep: state.currentStep,
            mode: state.mode,
            completedSteps: Array.from(state.completedSteps),
          }),
          // Custom merge to handle Set conversion
          merge: (persistedState, currentState) => ({
            ...currentState,
            ...(persistedState as Partial<WorkspaceState>),
            completedSteps: new Set(
              (persistedState as { completedSteps?: WorkspaceStep[] })?.completedSteps ?? []
            ),
          }),
        }
      ),
      { name: 'SessionWorkspace' }
    )
  )
);

// ============================================================================
// Server Sync Configuration
// ============================================================================

/** Debounce interval for server sync (60 seconds as per spec) */
const SYNC_DEBOUNCE_MS = 60_000;

/** Minimum time between syncs */
const MIN_SYNC_INTERVAL_MS = 5_000;

/** Track debounce timer globally */
let syncTimeoutId: ReturnType<typeof setTimeout> | null = null;
let lastSyncTime = 0;

/**
 * Schedule a debounced sync to the server.
 * Called automatically when state changes.
 */
function scheduleDebouncedSync(): void {
  // Clear any existing timeout
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
  }

  syncTimeoutId = setTimeout(() => {
    const state = useWorkspaceStore.getState();
    if (state.isDirty && !state.isSaving) {
      void state.saveDraftToServer();
    }
    syncTimeoutId = null;
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Trigger immediate sync if enough time has passed.
 * Used for step changes and beforeunload.
 */
function triggerImmediateSync(): void {
  const now = Date.now();
  if (now - lastSyncTime < MIN_SYNC_INTERVAL_MS) {
    return; // Too soon, let debounce handle it
  }

  const state = useWorkspaceStore.getState();
  if (state.isDirty && !state.isSaving) {
    lastSyncTime = now;
    void state.saveDraftToServer();
  }
}

/**
 * Subscribe to store changes and schedule syncs.
 * Called once at module load.
 */
function setupServerSync(): void {
  // Subscribe to isDirty changes
  useWorkspaceStore.subscribe(
    (state) => state.isDirty,
    (isDirty) => {
      if (isDirty) {
        scheduleDebouncedSync();
      }
    }
  );

  // Sync on step changes (more aggressive)
  useWorkspaceStore.subscribe(
    (state) => state.currentStep,
    () => {
      triggerImmediateSync();
    }
  );

  // Sync on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      const state = useWorkspaceStore.getState();
      if (state.isDirty && state.draftId) {
        // Use sendBeacon for reliable delivery on page close
        const workspaceState: Record<string, unknown> = {
          setting: state.setting,
          locations: state.locations,
          npcs: state.npcs,
          player: state.player,
          tags: state.tags,
          relationships: state.relationships,
          completedSteps: Array.from(state.completedSteps),
          mode: state.mode,
        };

        const payload = JSON.stringify({
          workspaceState,
          currentStep: state.currentStep,
        });

        // Try sendBeacon first (most reliable for unload)
        const url = `/api/workspace-drafts/${state.draftId}`;
        const success = navigator.sendBeacon(
          url,
          new Blob([payload], { type: 'application/json' })
        );

        if (!success) {
          console.warn('[Workspace] sendBeacon failed, data may be lost');
        }
      }
    });
  }
}

// Initialize server sync on module load
setupServerSync();

/**
 * Load user's mode preference from the server and apply to store.
 * Called once on module load to sync with persisted preference.
 */
async function loadModePreference(): Promise<void> {
  try {
    const mode = await getWorkspaceModePreference();
    const currentMode = useWorkspaceStore.getState().mode;
    if (mode !== currentMode) {
      // Use setState directly to avoid triggering the server save
      useWorkspaceStore.setState({ mode }, false, 'loadModePreference');
      console.log('[Workspace] Loaded mode preference from server:', mode);
    }
  } catch (err) {
    console.warn('[Workspace] Failed to load mode preference:', err);
    // Keep localStorage/default mode
  }
}

// Load mode preference on module init (after a small delay to not block initial render)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    void loadModePreference();
  }, 100);
}

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCurrentStep = () => useWorkspaceStore((s) => s.currentStep);
export const useSettingState = () => useWorkspaceStore((s) => s.setting);
export const useNpcsState = () => useWorkspaceStore((s) => s.npcs);
export const usePlayerState = () => useWorkspaceStore((s) => s.player);
export const useTagsState = () => useWorkspaceStore((s) => s.tags);
export const useWorkspaceMode = () => useWorkspaceStore((s) => s.mode);
export const useIsDirty = () => useWorkspaceStore((s) => s.isDirty);

/**
 * Use validation state. This hook memoizes the validation result
 * based on the actual data that affects validation (setting + npcs).
 */
export const useValidation = (): ValidationResult => {
  const setting = useWorkspaceStore((s) => s.setting);
  const npcs = useWorkspaceStore((s) => s.npcs);
  const player = useWorkspaceStore((s) => s.player);
  const tags = useWorkspaceStore((s) => s.tags);
  const locations = useWorkspaceStore((s) => s.locations);
  const relationships = useWorkspaceStore((s) => s.relationships);
  const validate = useWorkspaceStore((s) => s.validate);

  // Memoize validation result to avoid infinite re-renders
  return useMemo(
    () => validate(),
    [
      setting.settingId,
      npcs.length,
      player.personaId,
      tags.length,
      locations.mapId,
      relationships.length,
      validate,
    ]
  );
};

/**
 * Hook that returns save status and actions for the workspace.
 * Provides manual save trigger and status indicators.
 */
export const useSaveStatus = () => {
  const isDirty = useWorkspaceStore((s) => s.isDirty);
  const isSaving = useWorkspaceStore((s) => s.isSaving);
  const lastSavedAt = useWorkspaceStore((s) => s.lastSavedAt);
  const draftId = useWorkspaceStore((s) => s.draftId);
  const saveDraftToServer = useWorkspaceStore((s) => s.saveDraftToServer);
  const deleteDraftFromServer = useWorkspaceStore((s) => s.deleteDraftFromServer);

  return {
    isDirty,
    isSaving,
    lastSavedAt,
    hasDraft: !!draftId,
    save: saveDraftToServer,
    deleteDraft: deleteDraftFromServer,
  };
};
