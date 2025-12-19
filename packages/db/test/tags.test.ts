vi.mock('../src/client.js', () => {
  const query = vi.fn();
  const connect = vi.fn();
  return {
    pool: { query, connect },
  };
});

import { pool } from '../src/client.js';
import {
  createSessionTagBinding,
  deletePromptTag,
  getPromptTag,
  listPromptTags,
  toggleSessionTagBinding,
  updatePromptTag,
  type ListTagsOptions,
  type UpdateTagInput,
} from '../src/tags.js';

const mockQuery = pool.query as unknown as ReturnType<typeof vi.fn>;

describe('tags data access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  test('listPromptTags builds where clause based on options', async () => {
    const cases: {
      options: ListTagsOptions;
      expectedSql: string;
      expectedParams: unknown[];
    }[] = [
      {
        options: {},
        expectedSql:
          "SELECT * FROM prompt_tags WHERE visibility IN ('public', 'unlisted') ORDER BY category, name ASC",
        expectedParams: [],
      },
      {
        options: {
          owner: 'alice',
          category: 'style',
          activationMode: 'conditional',
          isBuiltIn: true,
        },
        expectedSql:
          "SELECT * FROM prompt_tags WHERE (visibility IN ('public', 'unlisted') OR owner = $1) AND category = $2 AND activation_mode = $3 AND is_built_in = $4 ORDER BY category, name ASC",
        expectedParams: ['alice', 'style', 'conditional', true],
      },
    ];

    for (const { options, expectedSql, expectedParams } of cases) {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await listPromptTags(options);
      expect(mockQuery).toHaveBeenCalledWith(expectedSql, expectedParams);
    }
  });

  test('getPromptTag respects owner visibility logic', async () => {
    const cases = [
      {
        args: { id: 'id-1', owner: 'alice' },
        expectedSql:
          "SELECT * FROM prompt_tags WHERE id = $1 AND (visibility IN ('public', 'unlisted') OR owner = $2)",
        expectedParams: ['id-1', 'alice'],
      },
      {
        args: { id: 'id-2' },
        expectedSql:
          "SELECT * FROM prompt_tags WHERE id = $1 AND visibility IN ('public', 'unlisted')",
        expectedParams: ['id-2'],
      },
    ];

    for (const { args, expectedSql, expectedParams } of cases) {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: args.id }] });
      const result = await getPromptTag(args.id, args.owner);
      expect(mockQuery).toHaveBeenCalledWith(expectedSql, expectedParams);
      expect(result?.id).toBe(args.id);
    }
  });

  test('updatePromptTag increments version only when changelog provided', async () => {
    const cases: {
      updates: UpdateTagInput;
      expectVersionInParams: boolean;
      expectedVersion: string;
    }[] = [
      {
        updates: { name: 'New', changelog: 'Added stuff' },
        expectVersionInParams: true,
        expectedVersion: '1.0.1',
      },
      {
        updates: { name: 'Rename' },
        expectVersionInParams: false,
        expectedVersion: '1.0.0',
      },
    ];

    for (const { updates, expectedVersion, expectVersionInParams } of cases) {
      mockQuery.mockResolvedValueOnce({ rows: [{ version: '1.0.0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ version: expectedVersion }] });

      const result = await updatePromptTag('tag-1', 'owner-1', updates);

      const updateCall = mockQuery.mock.calls.at(-1);
      expect(updateCall).toBeDefined();
      const params = (updateCall as unknown[])[1] as unknown[];
      if (expectVersionInParams) {
        expect(params).toContain(expectedVersion);
      } else {
        expect(params).not.toContain(expectedVersion);
      }
      expect(result?.version).toBe(expectedVersion);
    }
  });

  test('createSessionTagBinding and toggle/delete use pool.query with expected args', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'binding-1' }] });
    const binding = await createSessionTagBinding({ sessionId: 's1', tagId: 't1' });
    expect(binding.id).toBe('binding-1');

    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'binding-1', enabled: false }] });
    const toggled = await toggleSessionTagBinding('binding-1', false);
    expect(toggled?.enabled).toBe(false);

    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const deleted = await deletePromptTag('tag-1', 'owner-1');
    expect(deleted).toBe(true);
  });
});
