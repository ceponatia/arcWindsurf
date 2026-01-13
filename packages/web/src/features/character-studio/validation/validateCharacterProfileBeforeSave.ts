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

  return errors;
}
