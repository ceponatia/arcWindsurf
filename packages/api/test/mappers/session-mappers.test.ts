import { describe, it, expect } from 'vitest';
import { mapSessionListItem } from '../../src/mappers/session-mappers.js';

describe('mappers/session-mappers', () => {
  it('maps session list items with optional names', () => {
    const session = {
      id: 'session-1',
      playerCharacterId: 'char-1',
      settingId: 'setting-1',
      createdAt: new Date('2026-01-22T00:00:00.000Z'),
    };

    const result = mapSessionListItem(session as never, 'Hero', 'Setting');

    expect(result).toEqual({
      id: 'session-1',
      characterTemplateId: 'char-1',
      characterInstanceId: null,
      settingTemplateId: 'setting-1',
      settingInstanceId: null,
      createdAt: new Date('2026-01-22T00:00:00.000Z'),
      characterName: 'Hero',
      settingName: 'Setting',
    });
  });

  it('omits optional names when absent', () => {
    const session = {
      id: 'session-2',
      playerCharacterId: null,
      settingId: null,
      createdAt: new Date('2026-01-22T00:00:00.000Z'),
    };

    const result = mapSessionListItem(session as never, null, null);

    expect(result).toEqual({
      id: 'session-2',
      characterTemplateId: null,
      characterInstanceId: null,
      settingTemplateId: null,
      settingInstanceId: null,
      createdAt: new Date('2026-01-22T00:00:00.000Z'),
    });
  });
});
