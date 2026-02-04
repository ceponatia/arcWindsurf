/**
 * Loader for sensory-modifiers data.
 *
 * Retrieval uses this data to attach hygiene-level dependent scent modifiers to
 * generated/templated text without depending on API or characters packages.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SensoryModifiersDataSchema,
  getSensoryModifierByLevel,
  type LoadedSensoryModifiers,
  type BodyPartSensoryModifiers,
  type SensoryModifierLevels,
} from '@minimal-rpg/schemas';
import { resolveDataDir } from '../config.js';

const SENSORY_MODIFIERS_FILE = 'sensory-modifiers.json';

function getBodyPartModifiers(
  bodyParts: Record<string, BodyPartSensoryModifiers>,
  bodyPart: string
): BodyPartSensoryModifiers | undefined {
  const entry = Object.getOwnPropertyDescriptor(bodyParts, bodyPart);
  return entry?.value as BodyPartSensoryModifiers | undefined;
}

function getSenseModifiers(
  part: BodyPartSensoryModifiers | undefined,
  senseType: 'smell' | 'touch' | 'taste'
): SensoryModifierLevels | undefined {
  if (!part) return undefined;
  switch (senseType) {
    case 'smell':
      return part.smell;
    case 'touch':
      return part.touch;
    case 'taste':
      return part.taste;
    default:
      return undefined;
  }
}

/**
 * Load and validate sensory modifiers from `sensory-modifiers.json`.
 */
export async function loadSensoryModifiers(dataDir?: string): Promise<LoadedSensoryModifiers> {
  const base = resolveDataDir(dataDir);
  const filePath = path.join(base, SENSORY_MODIFIERS_FILE);

  const raw = await fs.promises.readFile(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);

  const result = SensoryModifiersDataSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid sensory modifiers data at ${filePath}: ${result.error.message}`);
  }

  const data = result.data;

  return {
    data,
    bodyParts: data.bodyParts,
    decayRates: data.decayRates,
    getModifier: (bodyPart, senseType, level) => {
      const part = getBodyPartModifiers(data.bodyParts, bodyPart);
      const sense = getSenseModifiers(part, senseType);
      return sense ? getSensoryModifierByLevel(sense, level) : '';
    },
  };
}
