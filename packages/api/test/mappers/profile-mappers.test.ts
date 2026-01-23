import { describe, it, expect } from 'vitest';
import type { CharacterProfile, SettingProfile, PersonaProfile } from '@minimal-rpg/schemas';
import { mapCharacterSummary, mapSettingSummary, mapPersonaSummary } from '../../src/mappers/profile-mappers.js';

describe('mappers/profile-mappers', () => {
  it('maps character summaries and preserves tags', () => {
    const profile = {
      id: 'char-1',
      name: 'Hero',
      summary: 'Summary',
      tags: ['tag-1'],
    } as unknown as CharacterProfile;

    const summary = mapCharacterSummary(profile, 'db');

    expect(summary).toEqual({
      id: 'char-1',
      name: 'Hero',
      summary: 'Summary',
      source: 'db',
      tags: ['tag-1'],
    });
  });

  it('omits character tags when empty', () => {
    const profile = {
      id: 'char-2',
      name: 'NoTags',
      summary: 'Summary',
      tags: [],
    } as unknown as CharacterProfile;

    const summary = mapCharacterSummary(profile, 'fs');

    expect(summary).toEqual({
      id: 'char-2',
      name: 'NoTags',
      summary: 'Summary',
      source: 'fs',
    });
  });

  it('maps setting summaries', () => {
    const setting = { id: 'set-1', name: 'Setting' } as unknown as SettingProfile;

    const summary = mapSettingSummary(setting, 'db');

    expect(summary).toEqual({ id: 'set-1', name: 'Setting', source: 'db' });
  });

  it('maps persona summaries with db source', () => {
    const persona = { id: 'p-1', name: 'Persona', summary: 'bio' } as unknown as PersonaProfile;

    const summary = mapPersonaSummary(persona);

    expect(summary).toEqual({ id: 'p-1', name: 'Persona', summary: 'bio', source: 'db' });
  });
});
