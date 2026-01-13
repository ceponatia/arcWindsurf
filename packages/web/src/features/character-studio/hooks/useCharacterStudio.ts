import { useEffect, useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  characterProfile,
  characterId,
  isDirty,
  saveStatus,
  isStudioLoading,
  resetStudio,
  updateProfile,
  validateProfile,
  setFieldErrors,
  clearAllFieldErrors,
} from '../signals.js';
import { generateCharacterId, loadCharacter, persistCharacter } from '../services/api.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';

export interface UseCharacterStudioOptions {
  id?: string | null;
  onSave?: (() => void) | undefined;
}

export interface UseCharacterStudioResult {
  profile: Partial<CharacterProfile>;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isLoading: boolean;
  isEditing: boolean;
  save: () => Promise<void>;
  reset: () => void;
  updateField: <K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) => void;
}

export function useCharacterStudio(options: UseCharacterStudioOptions = {}): UseCharacterStudioResult {
  useSignals();

  const { id, onSave } = options;

  // Load character on mount if editing
  useEffect(() => {
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
      const current = characterProfile.value as Partial<CharacterProfile>;
      const profile: CharacterProfile = {
        ...current,
        id: current.id ?? generateCharacterId(),
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

      characterProfile.value = profile;
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

  const reset = useCallback(() => {
    resetStudio();
  }, []);

  return {
    profile: characterProfile.value,
    isDirty: isDirty.value,
    saveStatus: saveStatus.value,
    isLoading: isStudioLoading.value,
    isEditing: Boolean(id),
    save,
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
