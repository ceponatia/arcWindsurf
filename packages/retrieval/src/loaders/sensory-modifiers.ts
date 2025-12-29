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
  type BodyPartHygieneConfig,
  type BodyPartSensoryModifiers,
  type HygieneLevel,
  type SensoryModifiersData,
} from '@minimal-rpg/schemas';

const DEFAULT_DATA_DIR = (() => {
  // Default to repo-root ./data (caller can override)
  return path.resolve(process.cwd(), 'data');
})();

const SENSORY_MODIFIERS_FILE = 'sensory-modifiers.json';

export interface LoadedSensoryModifiers {
  data: SensoryModifiersData;
  bodyParts: Record<string, BodyPartSensoryModifiers>;
  decayRates: Record<string, BodyPartHygieneConfig>;
  getModifier: (
    bodyPart: string,
    senseType: 'smell' | 'touch' | 'taste',
    level: HygieneLevel
  ) => string;
}

function resolveDataDir(dataDir?: string): string {
  const dir = dataDir?.trim();
  if (dir) return path.resolve(dir);
  const envDir = process.env['DATA_DIR']?.trim();
  if (envDir) return path.resolve(envDir);
  return DEFAULT_DATA_DIR;
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
      const part = data.bodyParts[bodyPart];
      const sense = part?.[senseType];
      return sense ? getSensoryModifierByLevel(sense, level) : '';
    },
  };
}
