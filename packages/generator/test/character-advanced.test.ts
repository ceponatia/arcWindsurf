import { describe, it, expect } from 'vitest';
import { generateCharacter, getTheme } from '../src/index.js';

describe('generator/character advanced', () => {
  it('generates when fill-empty sees empty string values', () => {
    const theme = getTheme('base');

    const result = generateCharacter({
      theme,
      mode: 'fill-empty',
      existing: {
        name: '',
      },
    });

    expect(result.character.name.length).toBeGreaterThan(0);
    expect(result.meta.generatedFields).toContain('name');
  });

  it('uses personality dimension biases when present', () => {
    const theme = getTheme('modern-man');

    const result = generateCharacter({ theme });
    const dims = result.character.personalityMap?.dimensions;

    expect(dims?.openness).toBeGreaterThanOrEqual(0.3);
    expect(dims?.openness).toBeLessThanOrEqual(0.7);
    expect(dims?.neuroticism).toBeGreaterThanOrEqual(0.2);
    expect(dims?.neuroticism).toBeLessThanOrEqual(0.5);
  });

  it('records skipped body regions for gender mismatch', () => {
    const base = getTheme('base');

    const theme = {
      ...base,
      body: {
        ...base.body,
        regionPopulationRate: 1,
        regionsToPopulate: ['penis'],
      },
    } as unknown as typeof base;

    const result = generateCharacter({
      theme,
      mode: 'fill-empty',
      existing: {
        gender: 'female',
      },
    });

    expect(result.meta.skippedFields).toContain('body.penis');
    expect(result.character.body && Object.keys(result.character.body).length).toBe(0);
  });
});
