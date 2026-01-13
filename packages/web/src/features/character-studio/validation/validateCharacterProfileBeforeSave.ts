import type { CharacterProfile } from '@minimal-rpg/schemas';
import { validateRequiredString } from './required.js';
import type { StudioFieldErrors } from './types.js';

/**
 * Validate required Character Studio fields before saving.
 *
 * Keep this focused on interactive "save" validation (UX), not schema completeness.
 */
export function validateCharacterProfileBeforeSave(
  profile: Partial<CharacterProfile>
): StudioFieldErrors {
  const errors: StudioFieldErrors = {};

  const nameError = validateRequiredString(profile.name, 'Name');
  if (nameError) errors.name = nameError;

  const summaryError = validateRequiredString(profile.summary, 'Summary');
  if (summaryError) errors.summary = summaryError;

  const backstoryError = validateRequiredString(profile.backstory, 'Backstory');
  if (backstoryError) errors.backstory = backstoryError;

  const raceError = validateRequiredString(profile.race, 'Race');
  if (raceError) errors.race = raceError;

  // Age validation
  if (!profile.age || profile.age <= 0) {
    errors.age = 'Age is required';
  }

  // Gender validation
  if (!profile.gender || (profile.gender as string) === '') {
    errors.gender = 'Gender is required';
  }

  return errors;
}
