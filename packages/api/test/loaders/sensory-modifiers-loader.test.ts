import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fsMocks = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    readFileSync: fsMocks.readFileSync,
    promises: fsMocks.promises,
  },
  readFileSync: fsMocks.readFileSync,
  promises: fsMocks.promises,
}));

const { loadSensoryModifiers, loadSensoryModifiersSync } = await import(
  '../../src/loaders/sensory-modifiers-loader.js'
);

const validData = {
  bodyParts: {
    hand: {
      smell: {
        '0': '',
        '1': 'hint',
        '2': 'noticeable',
        '3': 'strong',
        '4': 'overpowering',
      },
      touch: {
        '0': '',
        '1': 'tacky',
        '2': 'grimy',
        '3': 'sticky',
        '4': 'filthy',
      },
    },
  },
  decayRates: {
    hand: {
      bodyPart: 'hand',
      thresholds: [5, 15, 30, 60],
      baseDecayPerTurn: 2,
    },
  },
};

describe('loaders/sensory-modifiers-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and exposes modifiers from disk', async () => {
    fsMocks.promises.readFile.mockResolvedValue(JSON.stringify(validData));

    const result = await loadSensoryModifiers('/data');

    expect(result.bodyParts).toEqual(validData.bodyParts);
    expect(result.decayRates).toEqual(validData.decayRates);
    expect(result.getModifier('hand', 'smell', 2)).toBe('noticeable');
    expect(result.getModifier('missing', 'smell', 2)).toBe('');
    expect(fsMocks.promises.readFile).toHaveBeenCalledWith(
      path.join('/data', 'sensory-modifiers.json'),
      'utf-8'
    );
  });

  it('throws when the JSON is invalid', async () => {
    fsMocks.promises.readFile.mockResolvedValue('not-json');

    await expect(loadSensoryModifiers('/data')).rejects.toThrow(
      `Invalid JSON in sensory modifiers file: ${path.join('/data', 'sensory-modifiers.json')}`
    );
  });

  it('throws when the file is missing', async () => {
    fsMocks.promises.readFile.mockRejectedValue(new Error('missing file'));

    await expect(loadSensoryModifiers('/data')).rejects.toThrow(
      `Sensory modifiers file not found: ${path.join('/data', 'sensory-modifiers.json')}`
    );
  });

  it('throws when validation fails', async () => {
    fsMocks.promises.readFile.mockResolvedValue(JSON.stringify({ bodyParts: {} }));

    await expect(loadSensoryModifiers('/data')).rejects.toThrow(
      'Invalid sensory modifiers data'
    );
  });

  it('loads modifiers synchronously', () => {
    fsMocks.readFileSync.mockReturnValue(JSON.stringify(validData));

    const result = loadSensoryModifiersSync('/data');

    expect(result.getModifier('hand', 'touch', 1)).toBe('tacky');
    expect(fsMocks.readFileSync).toHaveBeenCalledWith(
      path.join('/data', 'sensory-modifiers.json'),
      'utf-8'
    );
  });
});
