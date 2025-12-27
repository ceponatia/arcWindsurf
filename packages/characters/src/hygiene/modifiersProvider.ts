import fs from 'node:fs';
import path from 'node:path';
import { SensoryModifiersDataSchema } from '@minimal-rpg/schemas';
import { parseJsonWithSchema } from '@minimal-rpg/utils';
import type { z } from 'zod';
import type { HygieneModifiersProvider, HygieneSensoryModifiers } from './types.js';
import { resolveDataDir } from '../utils/dataDir.js';

const SENSORY_MODIFIERS_FILE = 'sensory-modifiers.json';

export interface FileHygieneModifiersOptions {
  dataDir?: string;
}

export class FileHygieneModifiersProvider implements HygieneModifiersProvider {
  private readonly dataDir: string | undefined;
  private cache: HygieneSensoryModifiers | null = null;
  private loadPromise: Promise<HygieneSensoryModifiers> | null = null;

  constructor(options?: FileHygieneModifiersOptions) {
    // Treat "" as "not provided"
    const dir = options?.dataDir?.trim();
    this.dataDir = dir ?? undefined;
  }

  async load(): Promise<HygieneSensoryModifiers> {
    if (this.cache) return this.cache;

    // Prevent duplicate reads if load() is called concurrently
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const base = resolveDataDir(this.dataDir);
      const filePath = path.join(base, SENSORY_MODIFIERS_FILE);

      let raw: string;
      try {
        raw = await fs.promises.readFile(filePath, 'utf-8');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to read sensory modifiers at ${filePath}: ${message}`);
      }

      let parsed: z.infer<typeof SensoryModifiersDataSchema>;
      try {
        parsed = parseJsonWithSchema<z.infer<typeof SensoryModifiersDataSchema>>(
          raw,
          SensoryModifiersDataSchema
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid sensory modifiers data at ${filePath}: ${message}`);
      }

      const loaded: HygieneSensoryModifiers = {
        decayRates: parsed.decayRates,
        bodyParts: parsed.bodyParts,
      };

      this.cache = loaded;
      return loaded;
    })();

    try {
      return await this.loadPromise;
    } finally {
      // If it failed, allow retries on next call
      this.loadPromise = null;
    }
  }
}
