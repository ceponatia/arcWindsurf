import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CHARACTER_PATHS,
  DEFAULT_SETTING_PATHS,
  createKnowledgeNode,
  diffNodes,
  extractNodes,
  getPathImportance,
  getValueAtPath,
  nodeContentChanged,
  valueToContent,
} from '../src/extraction/index.js';
import type { ExtractedNode } from '../src/extraction/index.js';
import type { KnowledgeNode } from '../src/types.js';

describe('getPathImportance', () => {
  const cases = [
    { path: 'name', expected: 0.9 },
    { path: 'appearance.hair.color', expected: 0.4 },
    { path: 'unknown.path', expected: 0.5 },
  ];

  cases.forEach(({ path, expected }) => {
    it(`returns importance for ${path}`, () => {
      expect(getPathImportance(path)).toBeCloseTo(expected);
    });
  });
});

describe('getValueAtPath', () => {
  const sample = { a: { b: { c: 3 } }, flat: 1, array: [{ d: 4 }] };

  const cases = [
    { path: 'a.b.c', expected: 3 },
    { path: 'flat', expected: 1 },
    { path: 'array.0.d', expected: 4 },
    { path: 'missing', expected: undefined },
  ];

  cases.forEach(({ path, expected }) => {
    it(`handles ${path}`, () => {
      expect(getValueAtPath(sample, path)).toBe(expected);
    });
  });

  it('returns undefined for null root', () => {
    expect(getValueAtPath(null, 'anything')).toBeUndefined();
  });
});

describe('valueToContent', () => {
  const cases = [
    { value: ['a', 'b'], expected: 'a, b' },
    { value: [{ key: 'v' }], expected: '{"key":"v"}' },
    { value: { one: '1', two: 2, empty: '' }, expected: 'one: 1, two: 2' },
    { value: 5, expected: '5' },
    { value: true, expected: 'true' },
    { value: ' spaced ', expected: 'spaced' },
    { value: [], expected: null },
    { value: {}, expected: null },
    { value: '', expected: null },
    { value: null, expected: null },
  ];

  cases.forEach(({ value, expected }) => {
    it(`converts ${JSON.stringify(value)} to content`, () => {
      expect(valueToContent(value)).toBe(expected);
    });
  });
});

describe('extractNodes', () => {
  it('extracts nodes using provided paths', () => {
    const profile = { name: 'Aria', personality: { traits: ['brave', 'curious'] } };
    const { nodes, errors } = extractNodes(profile, ['name', 'personality.traits']);

    expect(errors).toHaveLength(0);
    expect(nodes).toEqual([
      { path: 'name', content: 'Aria', baseImportance: getPathImportance('name') },
      {
        path: 'personality.traits',
        content: 'brave, curious',
        baseImportance: getPathImportance('personality.traits'),
      },
    ] satisfies ExtractedNode[]);
  });

  it('uses defaults when paths not provided', () => {
    const profile = { name: 'Setting', summary: 'A quiet town' };
    const { nodes } = extractNodes(profile, undefined, false);

    expect(nodes.some((n) => n.path === DEFAULT_SETTING_PATHS[0])).toBe(true);
  });
});

describe('createKnowledgeNode', () => {
  it('copies extracted values and sets metadata', () => {
    const extracted: ExtractedNode = { path: 'name', content: 'Aria', baseImportance: 0.8 };
    const node = createKnowledgeNode(extracted, {
      id: 'node-1',
      characterInstanceId: 'char-1',
    });

    expect(node).toMatchObject({
      id: 'node-1',
      path: 'name',
      content: 'Aria',
      baseImportance: 0.8,
      narrativeImportance: 0,
      characterInstanceId: 'char-1',
    });
    expect(node.createdAt).toBeInstanceOf(Date);
    expect(node.updatedAt).toBeInstanceOf(Date);
  });
});

describe('nodeContentChanged', () => {
  it('detects changes in content', () => {
    const existing = {
      id: 'node-1',
      path: 'name',
      content: 'Old',
      baseImportance: 0.5,
      narrativeImportance: 0,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    } satisfies KnowledgeNode;

    const extracted: ExtractedNode = { path: 'name', content: 'New', baseImportance: 0.5 };

    expect(nodeContentChanged(existing, extracted)).toBe(true);
    expect(nodeContentChanged(existing, { ...extracted, content: 'Old' })).toBe(false);
  });
});

describe('diffNodes', () => {
  it('identifies creates, updates, unchanged, and removals', () => {
    const existing: KnowledgeNode[] = [
      {
        id: 'keep',
        path: 'keep',
        content: 'same',
        baseImportance: 0.5,
        narrativeImportance: 0,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        id: 'update',
        path: 'update',
        content: 'old',
        baseImportance: 0.5,
        narrativeImportance: 0,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        id: 'remove',
        path: 'remove',
        content: 'gone',
        baseImportance: 0.5,
        narrativeImportance: 0,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ];

    const extracted: ExtractedNode[] = [
      { path: 'keep', content: 'same', baseImportance: 0.5 },
      { path: 'update', content: 'new', baseImportance: 0.5 },
      { path: 'new', content: 'brand new', baseImportance: 0.5 },
    ];

    const diff = diffNodes(existing, extracted);

    expect(diff.toCreate.map((n) => n.path)).toEqual(['new']);
    expect(diff.toUpdate.map((pair) => pair.existing.id)).toEqual(['update']);
    expect(diff.unchanged.map((n) => n.id)).toEqual(['keep']);
    expect(diff.toRemove.map((n) => n.id)).toEqual(['remove']);
  });
});

describe('defaults', () => {
  it('exposes character and setting defaults', () => {
    expect(Array.isArray(DEFAULT_CHARACTER_PATHS)).toBe(true);
    expect(Array.isArray(DEFAULT_SETTING_PATHS)).toBe(true);
  });
});
