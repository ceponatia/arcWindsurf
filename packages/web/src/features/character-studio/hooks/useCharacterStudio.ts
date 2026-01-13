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
  setFieldErrors,
  clearAllFieldErrors,
} from '../signals.js';
import { generateCharacterId, loadCharacter, persistCharacter } from '../services/api.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { validateCharacterProfileBeforeSave } from '../validation/validateCharacterProfileBeforeSave.js';

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
    const errors = validateCharacterProfileBeforeSave(characterProfile.value);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    saveStatus.value = 'saving';
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
