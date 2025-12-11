import { useState } from 'react';
import type { PersonaProfile, Gender } from '@minimal-rpg/schemas';
import {
  type FormState,
  type FormFieldErrors,
  type FormKey,
  createInitialState,
  createAppearanceEntry,
  createBodySensoryEntry,
} from '../types.js';

/**
 * Hook for managing persona builder form state.
 * Provides updateField, validation, and conversion to/from PersonaProfile.
 */
export function usePersonaBuilderForm(initialProfile?: PersonaProfile) {
  const [formState, setFormState] = useState<FormState>(() =>
    initialProfile ? mapProfileToForm(initialProfile) : createInitialState()
  );
  const [errors, setErrors] = useState<FormFieldErrors>({});

  const updateField = <K extends FormKey>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  return {
    formState,
    setFormState,
    errors,
    setErrors,
    updateField,
  };
}

/**
 * Map a PersonaProfile to form state.
 * For personas, we keep it simple - only use appearance as free-text string.
 */
export function mapProfileToForm(profile: PersonaProfile): FormState {
  const appearanceStr = typeof profile.appearance === 'string' ? profile.appearance : '';

  return {
    id: profile.id,
    name: profile.name,
    age: profile.age ?? 21,
    gender: profile.gender ?? '',
    summary: profile.summary ?? '',
    appearance: appearanceStr,
    appearances: [createAppearanceEntry()],
    bodySensory: [createBodySensoryEntry()],
  };
}

/**
 * Build a PersonaProfile from form state.
 */
export function buildProfileFromForm(formState: FormState): PersonaProfile {
  const profile: PersonaProfile = {
    id: formState.id.trim(),
    name: formState.name.trim(),
    age:
      typeof formState.age === 'number'
        ? formState.age
        : parseInt(String(formState.age), 10) || undefined,
    summary: formState.summary.trim(),
  };

  // Add optional fields only if present
  const genderTrimmed = formState.gender.trim();
  if (genderTrimmed) {
    profile.gender = genderTrimmed as Gender;
  }

  // Appearance: use free-text if provided
  const appearanceTrimmed = formState.appearance.trim();
  if (appearanceTrimmed) {
    profile.appearance = appearanceTrimmed;
  }

  // Body sensory data - not implemented for personas yet
  // Note: parseBodyEntries expects different format
  // const bodySensoryValid = formState.bodySensory.filter(e => e.raw.trim());
  // if (bodySensoryValid.length > 0) {
  //   profile.body = parseBodyEntries(bodySensoryValid) as BodyMap;
  // }

  return profile;
}
