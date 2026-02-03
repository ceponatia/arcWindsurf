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
  type LoadedSensoryModifiers,
  type SensoryModifiersData,
  type HygieneLevel,
} from '@minimal-rpg/schemas';
import { resolveDataDir } from './loader.js';

const SENSORY_MODIFIERS_FILE = 'sensory-modifiers.json';

function safeGetModifier(
  data: SensoryModifiersData,
  bodyPart: string,
  senseType: 'smell' | 'touch' | 'taste',
  level: HygieneLevel
): string {
  if (!Object.prototype.hasOwnProperty.call(data.bodyParts, bodyPart)) {
    return '';
  }

  // eslint-disable-next-line security/detect-object-injection -- bodyPart validated by schema
  const partModifiers = data.bodyParts[bodyPart];
  if (!partModifiers || !Object.prototype.hasOwnProperty.call(partModifiers, senseType)) {
    return '';
  }

  // eslint-disable-next-line security/detect-object-injection -- senseType constrained to smell/touch/taste
  const senseModifiers = partModifiers[senseType];
  return getSensoryModifierByLevel(senseModifiers, level);
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
    getModifier: (bodyPart, senseType, level) => safeGetModifier(data, bodyPart, senseType, level),
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
    getModifier: (bodyPart, senseType, level) => safeGetModifier(data, bodyPart, senseType, level),
  };
}
