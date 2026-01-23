import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSensoryModifiers } from '../src/loaders/sensory-modifiers.js';

describe('loadSensoryModifiers errors', () => {
  it('throws when file is missing', async () => {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sensory-modifiers-'));

    await expect(loadSensoryModifiers(tempDir)).rejects.toThrow('ENOENT');
  });

  it('throws when schema is invalid', async () => {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sensory-modifiers-'));
    const filePath = path.join(tempDir, 'sensory-modifiers.json');

    await fs.promises.writeFile(filePath, JSON.stringify({ bodyParts: null }), 'utf-8');

    await expect(loadSensoryModifiers(tempDir)).rejects.toThrow('Invalid sensory modifiers data');
  });
});
