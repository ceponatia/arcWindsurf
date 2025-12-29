import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSensoryModifiers } from '../src/loaders/sensory-modifiers.js';

const fileName = 'sensory-modifiers.json';

describe('loadSensoryModifiers', () => {
  it('parses data and exposes helper lookups', async () => {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sensory-modifiers-'));
    const data = {
      bodyParts: {
        armpits: {
          smell: {
            '0': '',
            '1': 'fresh',
            '2': 'noticeable',
            '3': 'strong',
            '4': 'pungent',
            '5': 'overpowering',
            '6': 'putrid',
          },
        },
      },
      decayRates: {
        armpits: {
          bodyPart: 'armpits',
          thresholds: [0, 10, 25, 50, 100, 200, 400],
          baseDecayPerTurn: 1.5,
        },
      },
    } satisfies Record<string, unknown>;

    await fs.promises.writeFile(path.join(tempDir, fileName), JSON.stringify(data), 'utf-8');

    const loaded = await loadSensoryModifiers(tempDir);

    expect(loaded.data.bodyParts.armpits?.smell?.['3']).toBe('strong');
    expect(loaded.decayRates.armpits.baseDecayPerTurn).toBe(1.5);
    expect(loaded.getModifier('armpits', 'smell', 3)).toBe('strong');
  });
});
