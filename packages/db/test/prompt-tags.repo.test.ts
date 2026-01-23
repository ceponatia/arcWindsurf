import { describe, it, expect, vi, beforeEach } from 'vitest';

const rows: Array<Record<string, unknown>> = [];

const query = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn(async () => rows),
  innerJoin: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  then: (resolve: (value: unknown) => void) => Promise.resolve(rows).then(resolve),
};

const mockDb = {
  select: vi.fn(() => query),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock('../src/connection/index.js', () => ({
  drizzle: mockDb,
}));

import {
  listPromptTags,
  getPromptTag,
  createPromptTag,
  updatePromptTag,
  deletePromptTag,
  createSessionTagBinding,
  getSessionTags,
  getSessionTagsWithDefinitions,
  toggleSessionTagBinding,
  deleteSessionTagBinding,
} from '../src/repositories/prompt-tags.js';

describe('prompt-tags repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rows.length = 0;
  });

  it('lists prompt tags with filters', async () => {
    rows.push({ id: 'tag-1' });

    const result = await listPromptTags({ category: 'style', isBuiltIn: true });

    expect(result).toEqual([{ id: 'tag-1' }]);
    expect(query.where).toHaveBeenCalled();
  });

  it('gets, creates, updates, and deletes prompt tags', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'tag-1' }]);
    const created = await createPromptTag({ name: 'Tag', promptText: 'text' });
    expect(created).toEqual({ id: 'tag-1' });

    rows.push({ id: 'tag-1' });
    const fetched = await getPromptTag('tag-1');
    expect(fetched).toEqual({ id: 'tag-1' });

    mockDb.returning.mockResolvedValueOnce([{ id: 'tag-1', name: 'Updated' }]);
    const updated = await updatePromptTag('tag-1', { name: 'Updated' });
    expect(updated).toEqual({ id: 'tag-1', name: 'Updated' });

    mockDb.returning.mockResolvedValueOnce([{ id: 'tag-1' }]);
    const deleted = await deletePromptTag('tag-1');
    expect(deleted).toBe(true);
  });

  it('creates and toggles session tag bindings', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 'binding-1' }]);
    const created = await createSessionTagBinding('owner', {
      sessionId: 'session-1',
      tagId: 'tag-1',
    });
    expect(created).toEqual({ id: 'binding-1' });

    rows.push({ id: 'binding-1' });
    const bindings = await getSessionTags('session-1');
    expect(bindings).toEqual([{ id: 'binding-1' }]);

    mockDb.returning.mockResolvedValueOnce([{ id: 'binding-1', enabled: false }]);
    const toggled = await toggleSessionTagBinding('owner', 'binding-1', false);
    expect(toggled).toEqual({ id: 'binding-1', enabled: false });

    mockDb.returning.mockResolvedValueOnce([{ id: 'binding-1' }]);
    const deleted = await deleteSessionTagBinding('owner', 'binding-1');
    expect(deleted).toBe(true);
  });

  it('gets session tags with definitions', async () => {
    rows.push({
      binding: { id: 'binding-1' },
      tag: { id: 'tag-1', name: 'Tag' },
    });

    const result = await getSessionTagsWithDefinitions('owner', 'session-1', { enabledOnly: true });

    expect(result).toEqual([{ id: 'binding-1', tag: { id: 'tag-1', name: 'Tag' } }]);
  });
});
