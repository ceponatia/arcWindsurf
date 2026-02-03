import {
  BODY_REGIONS,
  APPEARANCE_REGIONS,
  type BodyRegion,
  type AppearanceRegion,
  type FormSensoryType,
} from '@minimal-rpg/schemas';

/**
 * Form entry for body sensory data.
 * Supports raw text input that gets parsed to structured BodyMap.
 */
export interface PersonaBodySensoryEntry {
  /** Body region (hair, torso, feet, etc.) */
  region: BodyRegion;
  /** Sensory type: scent, texture, or flavor (visual is covered by appearance section) */
  type: FormSensoryType;
  /** Raw text description (parsed on save) */
  raw: string;
}

/**
 * Form entry for appearance data.
 * Each entry specifies a region, attribute, and value.
 */
export interface PersonaAppearanceEntry {
  /** Appearance region (hair, eyes, arms, etc.) */
  region: AppearanceRegion;
  /** Attribute key for the region (e.g., 'color' for hair) */
  attribute: string;
  /** Value for the attribute */
  value: string;
}

export interface PersonaFormState {
  id: string;
  name: string;
  age: number | string;
  gender: string;
  summary: string;
  /** Free-text appearance (alternative to structured entries) */
  appearance: string;
  /** Structured appearance entries (region → attribute → value) */
  appearances: PersonaAppearanceEntry[];
  /** Body sensory entries (scent, texture, visual per region) */
  bodySensory: PersonaBodySensoryEntry[];
}

export type PersonaFormKey = keyof PersonaFormState;
export type PersonaFormFieldErrors = Partial<Record<PersonaFormKey, string>>;
export type PersonaUpdateFieldFn = <K extends keyof PersonaFormState>(
  key: K,
  value: PersonaFormState[K]
) => void;

export const createBodySensoryEntry = (): PersonaBodySensoryEntry => ({
  region: BODY_REGIONS[0],
  type: 'scent',
  raw: '',
});

export const createAppearanceEntry = (): PersonaAppearanceEntry => ({
  region: APPEARANCE_REGIONS[0],
  attribute: 'height',
  value: '',
});

export const createInitialState = (): PersonaFormState => ({
  id: '',
  name: '',
  age: 21,
  gender: '',
  summary: '',
  appearance: '',
  appearances: [createAppearanceEntry()],
  bodySensory: [createBodySensoryEntry()],
});
