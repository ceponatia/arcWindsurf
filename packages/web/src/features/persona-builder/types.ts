import {
  BODY_REGIONS,
  APPEARANCE_REGIONS,
  type BodyRegion,
  type AppearanceRegion,
} from '@minimal-rpg/schemas';

/**
 * Form entry for body sensory data.
 * Supports raw text input that gets parsed to structured BodyMap.
 */
export interface BodySensoryEntry {
  /** Body region (hair, torso, feet, etc.) */
  region: BodyRegion;
  /** Sensory type: scent, texture, or flavor (visual is covered by appearance section) */
  type: 'scent' | 'texture' | 'flavor';
  /** Raw text description (parsed on save) */
  raw: string;
}

/**
 * Form entry for appearance data.
 * Each entry specifies a region, attribute, and value.
 */
export interface AppearanceEntry {
  /** Appearance region (hair, eyes, arms, etc.) */
  region: AppearanceRegion;
  /** Attribute key for the region (e.g., 'color' for hair) */
  attribute: string;
  /** Value for the attribute */
  value: string;
}

export interface FormState {
  id: string;
  name: string;
  age: number | string;
  gender: string;
  summary: string;
  /** Free-text appearance (alternative to structured entries) */
  appearance: string;
  /** Structured appearance entries (region → attribute → value) */
  appearances: AppearanceEntry[];
  /** Body sensory entries (scent, texture, visual per region) */
  bodySensory: BodySensoryEntry[];
}

export type FormKey = keyof FormState;
export type FormFieldErrors = Partial<Record<FormKey, string>>;
export type UpdateFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const SENSORY_TYPES = ['scent', 'texture', 'flavor'] as const;
export type SensoryType = (typeof SENSORY_TYPES)[number];

export const createBodySensoryEntry = (): BodySensoryEntry => ({
  region: BODY_REGIONS[0],
  type: 'scent',
  raw: '',
});

export const createAppearanceEntry = (): AppearanceEntry => ({
  region: APPEARANCE_REGIONS[0],
  attribute: 'height',
  value: '',
});

export const createInitialState = (): FormState => ({
  id: '',
  name: '',
  age: 21,
  gender: '',
  summary: '',
  appearance: '',
  appearances: [createAppearanceEntry()],
  bodySensory: [createBodySensoryEntry()],
});
