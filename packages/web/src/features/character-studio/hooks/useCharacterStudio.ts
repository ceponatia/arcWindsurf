import { useEffect, useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  characterProfile,
  characterId,
  isDirty,
  saveStatus,
  resetStudio,
  updateProfile,
} from '../signals.js';
import { loadCharacter, persistCharacter } from '../services/api.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';

export interface UseCharacterStudioOptions {
  id?: string | null;
  onSave?: () => void;
}

export interface UseCharacterStudioResult {
  profile: Partial<CharacterProfile>;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
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
      characterId.value = id;
      loadCharacter(id).then(profile => {
        characterProfile.value = profile;
        isDirty.value = false;
      }).catch(err => {
        console.error('Failed to load character:', err);
      });
    } else {
      resetStudio();
    }

    return () => {
      // Cleanup on unmount
    };
  }, [id]);

  const save = useCallback(async () => {
    saveStatus.value = 'saving';
    try {
      const profile = characterProfile.value as CharacterProfile;
      await persistCharacter(profile);
      saveStatus.value = 'saved';
      isDirty.value = false;
      onSave?.();
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
    isEditing: Boolean(id),
    save,
    reset,
    updateField: updateProfile,
  };
}
