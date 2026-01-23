import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId } from '../src/features/setting-builder/utils.js';
import { createInitialFormState, mapProfileToForm, buildProfile } from '../src/features/setting-builder/transformers.js';
import type { SettingBackground } from '@minimal-rpg/schemas';

describe('setting builder utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('generates deterministic ids', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    expect(generateId()).toHaveLength(7);
  });

  it('creates initial state with uuid', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'uuid-1' });
    const state = createInitialFormState();
    expect(state.id).toBe('uuid-1');
  });

  it('maps profile to form and back', () => {
    const profile: SettingBackground = {
      id: 's1',
      name: 'World',
      lore: 'Lore',
      themes: ['mystery'],
      tags: ['tag'],
    } as SettingBackground;

    const form = mapProfileToForm(profile);
    expect(form.name).toBe('World');
    expect(form.themes).toBe('mystery');

    const rebuilt = buildProfile({
      ...form,
      worldRules: 'Rule 1\nRule 2',
      safetyRating: 'PG',
    });
    expect(rebuilt.worldRules).toEqual(['Rule 1', 'Rule 2']);
    expect(rebuilt.safety?.rating).toBe('PG');
  });
});
