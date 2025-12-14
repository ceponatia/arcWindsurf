/**
 * Loader for sensory modifiers data file.
 *
 * This module loads and validates the sensory-modifiers.json file which contains:
 * - Body part sensory modifiers for smell/touch/taste at each hygiene level
 * - Decay rate configurations (thresholds and base decay per turn)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SensoryModifiersDataSchema,
  getSensoryModifierByLevel,
  type SensoryModifiersData,
  type BodyPartHygieneConfig,
  type BodyPartSensoryModifiers,
  type HygieneLevel,
} from '@minimal-rpg/schemas';
import { resolveDataDir } from './loader.js';

const SENSORY_MODIFIERS_FILE = 'sensory-modifiers.json';

/**
 * Loaded sensory modifiers with typed accessors.
 */
export interface LoadedSensoryModifiers {
  /** Raw validated data */
  data: SensoryModifiersData;
  /** Body part sensory modifier lookup */
  bodyParts: Record<string, BodyPartSensoryModifiers>;
  /** Decay rate configuration lookup */
  decayRates: Record<string, BodyPartHygieneConfig>;
  /** Get sensory modifier text for a body part, sense type, and hygiene level */
  getModifier: (bodyPart: string, senseType: 'smell' | 'touch' | 'taste', level: HygieneLevel) => string;
}

/**
 * Load and validate sensory modifiers data.
 */
export async function loadSensoryModifiers(dataDir?: string): Promise<LoadedSensoryModifiers> {
  const base = resolveDataDir(dataDir);
  const filePath = path.join(base, SENSORY_MODIFIERS_FILE);

  let raw: string;
  try {
    raw = await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read sensory modifiers file at ${filePath}:`, err);
    throw new Error(`Sensory modifiers file not found: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse sensory modifiers JSON:`, err);
    throw new Error(`Invalid JSON in sensory modifiers file: ${filePath}`);
  }

  const result = SensoryModifiersDataSchema.safeParse(parsed);
  if (!result.success) {
    console.error('Sensory modifiers validation failed:', result.error.flatten());
    throw new Error(`Invalid sensory modifiers data: ${result.error.message}`);
  }

  const data = result.data;

  return {
    data,
    bodyParts: data.bodyParts,
    decayRates: data.decayRates,
    getModifier: (bodyPart, senseType, level) => {
      const partModifiers = data.bodyParts[bodyPart];
      if (!partModifiers) return '';

      const senseModifiers = partModifiers[senseType];
      return getSensoryModifierByLevel(senseModifiers, level);
    },
  };
}

/**
 * Synchronously load sensory modifiers (for startup validation).
 */
export function loadSensoryModifiersSync(dataDir?: string): LoadedSensoryModifiers {
  const base = resolveDataDir(dataDir);
  const filePath = path.join(base, SENSORY_MODIFIERS_FILE);

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read sensory modifiers file at ${filePath}:`, err);
    throw new Error(`Sensory modifiers file not found: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse sensory modifiers JSON:`, err);
    throw new Error(`Invalid JSON in sensory modifiers file: ${filePath}`);
  }

  const result = SensoryModifiersDataSchema.safeParse(parsed);
  if (!result.success) {
    console.error('Sensory modifiers validation failed:', result.error.flatten());
    throw new Error(`Invalid sensory modifiers data: ${result.error.message}`);
  }

  const data = result.data;

  return {
    data,
    bodyParts: data.bodyParts,
    decayRates: data.decayRates,
    getModifier: (bodyPart, senseType, level) => {
      const partModifiers = data.bodyParts[bodyPart];
      if (!partModifiers) return '';

      const senseModifiers = partModifiers[senseType];
      return getSensoryModifierByLevel(senseModifiers, level);
    },
  };
}
