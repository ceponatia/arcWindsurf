import { useEffect, useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  characterProfile,
  characterId,
  isDirty,
  saveStatus,
  isStudioLoading,
  resetStudio,
  resetStudioSession,
  updateProfile,
  validateProfile,
  clearAllFieldErrors,
  isDeleting,
} from '../signals.js';
import { generateCharacterId, loadCharacter, persistCharacter, removeCharacter } from '../services/api.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';

export interface UseCharacterStudioOptions {
  id?: string | null;
  onSave?: (() => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
}

export interface UseCharacterStudioResult {
  profile: Partial<CharacterProfile>;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isLoading: boolean;
  isDeleting: boolean;
  isEditing: boolean;
  save: () => Promise<void>;
  deleteCharacter: () => Promise<void>;
  reset: () => void;
  updateField: <K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) => void;
}

export function useCharacterStudio(options: UseCharacterStudioOptions = {}): UseCharacterStudioResult {
  useSignals();

  const { id, onSave, onDelete } = options;

  // Load character on mount if editing
  useEffect(() => {
    // Always reset conversation session on mount to ensure fresh start
    // Old sessions remain in DB for debugging (24h TTL)
    resetStudioSession();

    if (id) {
      isStudioLoading.value = true;
      characterId.value = id;
      loadCharacter(id).then(profile => {
        characterProfile.value = profile;
        isDirty.value = false;
        clearAllFieldErrors();
      }).catch(err => {
        console.error('Failed to load character:', err);
      }).finally(() => {
        isStudioLoading.value = false;
      });
    } else {
      resetStudio();
      characterProfile.value = {
        id: generateCharacterId(),
        tags: ['draft'],
        personality: 'Unspecified',
        backstory: '',
      };
    }

    return () => {
      // Cleanup on unmount
    };
  }, [id]);

  const save = useCallback(async () => {
    if (!validateProfile()) {
      return;
    }

    saveStatus.value = 'saving';
    const savingStartedAtMs = Date.now();
    try {
      const current = characterProfile.value;

      // Transform flat physique object to string for API
      // The AppearanceCard uses a flat object for editing, but the schema expects
      // either a string or nested PhysiqueSchema structure
      let physiqueForApi: CharacterProfile['physique'] = current.physique;
      if (current.physique && typeof current.physique === 'object' && !Array.isArray(current.physique)) {
        // Cast through unknown to handle both flat studio format and nested PhysiqueSchema
        const obj = current.physique as unknown as Record<string, unknown>;
        // Check if it's a flat studio format (has any of the AppearanceCard fields)
        // vs the nested PhysiqueSchema format (has build as object with height, etc.)
        const isFlatFormat = 'height' in obj || 'ageAppearance' in obj ||
          'notableFeatures' in obj || 'impression' in obj ||
          ('build' in obj && typeof obj['build'] === 'string');
        const buildVal = obj['build'];
        const isNestedFormat = buildVal && typeof buildVal === 'object';

        if (isFlatFormat && !isNestedFormat) {
          // Convert flat object to descriptive string for API
          const parts: string[] = [];
          const height = obj['height'];
          const build = obj['build'];
          const ageAppearance = obj['ageAppearance'];
          const notableFeatures = obj['notableFeatures'];
          const impression = obj['impression'];
          if (typeof height === 'string' && height) parts.push(`Height: ${height}`);
          if (typeof build === 'string' && build) parts.push(`Build: ${build}`);
          if (typeof ageAppearance === 'string' && ageAppearance) parts.push(`Appears: ${ageAppearance}`);
          if (typeof notableFeatures === 'string' && notableFeatures) parts.push(`Notable features: ${notableFeatures}`);
          if (typeof impression === 'string' && impression) parts.push(`Impression: ${impression}`);
          physiqueForApi = parts.length > 0 ? parts.join('. ') : undefined;
        }
      }

      const profile: CharacterProfile = {
        ...current,
        id: current.id ?? generateCharacterId(),
        physique: physiqueForApi,
        backstory: current.backstory && current.backstory.trim().length > 0
          ? current.backstory
          : 'Backstory not provided yet.',
        personality: current.personality && typeof current.personality === 'string'
          ? current.personality
          : Array.isArray(current.personality)
            ? (current.personality.length > 0 ? current.personality : 'Unspecified')
            : 'Unspecified',
        tags: current.tags ?? ['draft'],
      } as CharacterProfile;

      // Don't update characterProfile.value here - keep the flat physique object for form editing
      // Only send the transformed profile to the API
      await persistCharacter(profile);

      await waitForMinSavingIndicator(savingStartedAtMs, 300);
      saveStatus.value = 'saved';
      isDirty.value = false;
      clearAllFieldErrors();
      onSave?.();

      // Reset status after a delay
      setTimeout(() => {
        if (saveStatus.value === 'saved') {
          saveStatus.value = 'idle';
        }
      }, 3000);
    } catch {
      await waitForMinSavingIndicator(savingStartedAtMs, 300);
      saveStatus.value = 'error';
    }
  }, [onSave]);

  const deleteCharacter = useCallback(async () => {
    if (!id) return;

    const confirmed = window.confirm('Are you sure you want to delete this character? This action cannot be undone.');
    if (!confirmed) return;

    isDeleting.value = true;
    try {
      await removeCharacter(id);
      resetStudio();
      onDelete?.(id);
    } catch (err) {
      console.error('Failed to delete character:', err);
      alert('Failed to delete character. Please try again.');
    } finally {
      isDeleting.value = false;
    }
  }, [id, onDelete]);

  const reset = useCallback(() => {
    resetStudio();
  }, []);

  return {
    profile: characterProfile.value,
    isDirty: isDirty.value,
    saveStatus: saveStatus.value,
    isLoading: isStudioLoading.value,
    isDeleting: isDeleting.value,
    isEditing: Boolean(id),
    save,
    deleteCharacter,
    reset,
    updateField: updateProfile,
  };
}

/**
 * Ensures the saving indicator is visible for at least a minimum duration.
 *
 * This prevents instant failures (eg, network error) from skipping the
 * intermediate 'saving' UI state entirely.
 */
async function waitForMinSavingIndicator(startedAtMs: number, minDurationMs: number): Promise<void> {
  const elapsed = Date.now() - startedAtMs;
  const remaining = minDurationMs - elapsed;
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, remaining));
}
