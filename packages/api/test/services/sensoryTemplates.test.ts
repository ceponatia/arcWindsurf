import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SensoryTemplate } from '@minimal-rpg/schemas';

const templateMocks = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readdirSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  getSensoryTemplatesMock: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: templateMocks.existsSyncMock,
    readdirSync: templateMocks.readdirSyncMock,
    readFileSync: templateMocks.readFileSyncMock,
  },
}));

vi.mock('@minimal-rpg/schemas', async () => {
  const actual = await vi.importActual<typeof import('@minimal-rpg/schemas')>(
    '@minimal-rpg/schemas'
  );
  return {
    ...actual,
    getSensoryTemplates: templateMocks.getSensoryTemplatesMock,
  };
});

const templateA: SensoryTemplate = {
  id: 'template-a',
  name: 'Template A',
  description: 'First template',
  tags: ['test'],
  affectedRegions: ['head'],
  fragments: {
    head: {},
  },
};

const templateB: SensoryTemplate = {
  id: 'template-b',
  name: 'Template B',
  description: 'Second template',
  tags: ['test'],
  affectedRegions: ['hand'],
  fragments: {
    hand: {},
  },
};

describe('services/sensoryTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('falls back to static templates when no disk data', async () => {
    templateMocks.existsSyncMock.mockReturnValue(false);
    templateMocks.getSensoryTemplatesMock.mockReturnValue([templateA]);
    vi.spyOn(Date, 'now').mockReturnValue(10_000);

    const { getLiveSensoryTemplates } = await import('../../src/services/sensoryTemplates.js');
    const templates = getLiveSensoryTemplates();

    expect(templates).toEqual([templateA]);
    expect(templateMocks.readdirSyncMock).not.toHaveBeenCalled();
  });

  it('reads templates from disk and sorts by id', async () => {
    templateMocks.existsSyncMock.mockReturnValue(true);
    templateMocks.readdirSyncMock.mockReturnValue([
      { name: 'b.json', isFile: () => true },
      { name: 'ignore.txt', isFile: () => true },
      { name: 'a.json', isFile: () => true },
    ]);

    templateMocks.readFileSyncMock.mockImplementation((filePath: string) => {
      if (filePath.endsWith('a.json')) return JSON.stringify(templateA);
      if (filePath.endsWith('b.json')) return JSON.stringify(templateB);
      return '{}';
    });

    templateMocks.getSensoryTemplatesMock.mockReturnValue([]);
    vi.spyOn(Date, 'now').mockReturnValue(20_000);

    const { getLiveSensoryTemplates } = await import('../../src/services/sensoryTemplates.js');
    const templates = getLiveSensoryTemplates();

    expect(templates.map((t) => t.id)).toEqual(['template-a', 'template-b']);

    vi.spyOn(Date, 'now').mockReturnValue(22_000);
    getLiveSensoryTemplates();

    expect(templateMocks.readdirSyncMock).toHaveBeenCalledTimes(1);
  });
});
