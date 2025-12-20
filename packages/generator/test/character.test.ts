import { BASE_THEME, CHARACTER_THEMES, generateCharacter, getTheme } from '../src/index.js';

import { describe, expect, test } from 'vitest';

describe('generator/character exports', () => {
  test('getTheme returns base when unknown and returns known themes', () => {
    expect(getTheme('does-not-exist').id).toBe(BASE_THEME.id);

    const knownIds = Object.keys(CHARACTER_THEMES);
    expect(knownIds.length).toBeGreaterThan(0);

    for (const id of knownIds) {
      expect(getTheme(id).id).toBe(id);
    }
  });

  test('generateCharacter returns required shape and meta invariants', () => {
    const theme = getTheme('base');
    const result = generateCharacter({ theme });

    expect(result.character.id).toMatch(/^char-/);
    expect(typeof result.character.name).toBe('string');
    expect(result.character.name.length).toBeGreaterThan(0);

    // base theme uses first + last name
    expect(result.character.name.split(' ').length).toBeGreaterThanOrEqual(2);

    expect(result.character.age).toBeGreaterThanOrEqual(theme.basics.ageRange[0]);
    expect(result.character.age).toBeLessThanOrEqual(theme.basics.ageRange[1]);

    expect(result.character.tier).toBe('minor');
    expect(result.character.tags.length).toBeGreaterThan(0);

    expect(result.meta.themeId).toBe(theme.id);
    expect(result.meta.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(result.meta.generatedFields)).toBe(true);
    expect(Array.isArray(result.meta.skippedFields)).toBe(true);
  });

  test('generateCharacter fill-empty preserves existing values and records generatedFields', () => {
    const theme = getTheme('base');

    const existing = {
      id: 'char-existing',
      name: 'Existing Name',
      age: 42,
      summary: 'Existing summary',
      tags: ['existing'],
    };

    const result = generateCharacter({ theme, existing, mode: 'fill-empty' });

    expect(result.character.id).toBe(existing.id);
    expect(result.character.name).toBe(existing.name);
    expect(result.character.age).toBe(existing.age);
    expect(result.character.summary).toBe(existing.summary);
    expect(result.character.tags).toEqual(existing.tags);

    const generated = new Set(result.meta.generatedFields);
    expect(generated.has('id')).toBe(false);
    expect(generated.has('name')).toBe(false);
    expect(generated.has('age')).toBe(false);
    expect(generated.has('summary')).toBe(false);
    expect(generated.has('tags')).toBe(false);
  });

  test('generateCharacter overwrite generates even when existing values are present', () => {
    const theme = getTheme('base');

    const existing = {
      id: 'char-existing',
      name: 'Existing Name',
      age: 42,
      summary: 'Existing summary',
      tags: ['existing'],
    };

    const result = generateCharacter({ theme, existing, mode: 'overwrite-all' });

    const generated = new Set(result.meta.generatedFields);
    const cases = ['id', 'name', 'age', 'summary', 'tags'];

    for (const field of cases) {
      expect(generated.has(field)).toBe(true);
    }

    // Should still return valid character
    expect(result.character.id).toMatch(/^char-/);
    expect(result.character.age).toBeGreaterThanOrEqual(theme.basics.ageRange[0]);
    expect(result.character.age).toBeLessThanOrEqual(theme.basics.ageRange[1]);
  });
});
