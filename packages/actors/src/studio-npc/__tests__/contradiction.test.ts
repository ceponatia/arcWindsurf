import { describe, it, expect } from 'vitest';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { ContradictionMirror } from '../contradiction.js';
import type { InferredTrait } from '../types.js';

describe('studio-npc/contradiction', () => {
  it('detects numeric contradictions beyond the threshold', () => {
    const mirror = new ContradictionMirror();
    const profile: Partial<CharacterProfile> = {
      personalityMap: {
        dimensions: { openness: 0.9 },
      },
    };
    const newTrait: InferredTrait = {
      path: 'personalityMap.dimensions.openness',
      value: 0.4,
      confidence: 0.8,
      evidence: 'test',
      reasoning: 'test',
    };

    const result = mirror.detectContradiction(newTrait, profile);

    expect(result).not.toBeNull();
    expect(result?.reflectionPrompt).toContain('contradiction');
  });

  it('detects string contradictions', () => {
    const mirror = new ContradictionMirror();
    const profile: Partial<CharacterProfile> = {
      personalityMap: {
        social: {
          strangerDefault: 'guarded',
          warmthRate: 'slow',
          preferredRole: 'advisor',
          conflictStyle: 'diplomatic',
          criticismResponse: 'reflective',
          boundaries: 'healthy',
        },
      },
    };
    const newTrait: InferredTrait = {
      path: 'personalityMap.social.strangerDefault',
      value: 'welcoming',
      confidence: 0.8,
      evidence: 'test',
      reasoning: 'test',
    };

    const result = mirror.detectContradiction(newTrait, profile);

    expect(result).not.toBeNull();
    expect(result?.existingTrait.value).toBe('guarded');
  });

  it('returns null when differences are below the numeric threshold', () => {
    const mirror = new ContradictionMirror();
    const profile: Partial<CharacterProfile> = {
      personalityMap: {
        dimensions: { openness: 0.6 },
      },
    };
    const newTrait: InferredTrait = {
      path: 'personalityMap.dimensions.openness',
      value: 0.45,
      confidence: 0.8,
      evidence: 'test',
      reasoning: 'test',
    };

    const result = mirror.detectContradiction(newTrait, profile);

    expect(result).toBeNull();
  });
});
