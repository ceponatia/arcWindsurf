import { describe, it, expect } from 'vitest';
import { pruneBodyMap } from '../src/character/character-cleanup.js';
import type { BodyMap } from '@minimal-rpg/schemas';

describe('pruneBodyMap', () => {
  it('retains skin/overall and removes invalid keys', () => {
    const input: BodyMap = {
      skin: { scent: { primary: 'clean', intensity: 0.5 } },
      overall: { visual: { description: 'tall' } },
      unknown: { scent: { primary: 'bad', intensity: 0.2 } },
    } as unknown as BodyMap;

    const result = pruneBodyMap(input, 'human', 'female');

    expect(result.skin).toBeDefined();
    expect(result.overall).toBeDefined();
    expect((result as Record<string, unknown>)['unknown']).toBeUndefined();
  });
});
