import { describe, it, expect } from 'vitest';
import {
  getPathImportance,
  getValueAtPath,
  valueToContent,
  extractNodes,
  createKnowledgeNode,
  nodeContentChanged,
  diffNodes,
} from '../extraction.js';
import type { KnowledgeNode } from '../types.js';

describe('getPathImportance', () => {
  it('returns mapped importance for known paths', () => {
    expect(getPathImportance('name')).toBe(0.9);
    expect(getPathImportance('summary')).toBe(0.85);
    expect(getPathImportance('personality.traits')).toBe(0.8);
    expect(getPathImportance('appearance.hair')).toBe(0.4);
  });

  it('returns default importance for unknown paths', () => {
    expect(getPathImportance('unknown.path')).toBe(0.5);
  });

  it('matches nested paths by prefix', () => {
    expect(getPathImportance('appearance.hair.color')).toBe(0.4);
    expect(getPathImportance('personality.traits.primary')).toBe(0.8);
  });
});

describe('getValueAtPath', () => {
  it('gets top-level values', () => {
    expect(getValueAtPath({ name: 'Test' }, 'name')).toBe('Test');
  });

  it('gets nested values', () => {
    const obj = { appearance: { hair: { color: 'brown' } } };
    expect(getValueAtPath(obj, 'appearance.hair.color')).toBe('brown');
  });

  it('returns undefined for missing paths', () => {
    expect(getValueAtPath({ a: 1 }, 'b')).toBeUndefined();
    expect(getValueAtPath({ a: { b: 1 } }, 'a.c')).toBeUndefined();
  });

  it('handles null and undefined input', () => {
    expect(getValueAtPath(null, 'path')).toBeUndefined();
    expect(getValueAtPath(undefined, 'path')).toBeUndefined();
  });
});

describe('valueToContent', () => {
  it('converts strings', () => {
    expect(valueToContent('hello')).toBe('hello');
    expect(valueToContent('  trimmed  ')).toBe('trimmed');
    expect(valueToContent('')).toBeNull();
  });

  it('converts numbers and booleans', () => {
    expect(valueToContent(42)).toBe('42');
    expect(valueToContent(true)).toBe('true');
  });

  it('converts string arrays', () => {
    expect(valueToContent(['a', 'b', 'c'])).toBe('a, b, c');
    expect(valueToContent([])).toBeNull();
  });

  it('converts objects to key:value pairs', () => {
    const result = valueToContent({ color: 'brown', length: 'short' });
    expect(result).toContain('color: brown');
    expect(result).toContain('length: short');
  });

  it('returns null for null/undefined', () => {
    expect(valueToContent(null)).toBeNull();
    expect(valueToContent(undefined)).toBeNull();
  });
});

describe('extractNodes', () => {
  it('extracts nodes from character profile', () => {
    const profile = {
      name: 'Aria',
      summary: 'A brave adventurer',
      appearance: {
        hair: { color: 'brown', length: 'long' },
        eyes: { color: 'green' },
      },
      personality: {
        traits: ['brave', 'curious'],
      },
      goals: ['Find the treasure'],
    };

    const { nodes, errors } = extractNodes(profile, undefined, true);

    expect(errors).toHaveLength(0);
    expect(nodes.length).toBeGreaterThan(0);

    const nameNode = nodes.find((n) => n.path === 'name');
    expect(nameNode).toBeDefined();
    expect(nameNode?.content).toBe('Aria');
    expect(nameNode?.baseImportance).toBe(0.9);

    const traitsNode = nodes.find((n) => n.path === 'personality.traits');
    expect(traitsNode).toBeDefined();
    expect(traitsNode?.content).toBe('brave, curious');
  });

  it('uses custom paths when provided', () => {
    const profile = { name: 'Test', custom: 'value' };
    const { nodes } = extractNodes(profile, ['name', 'custom'], true);

    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.path)).toContain('name');
    expect(nodes.map((n) => n.path)).toContain('custom');
  });

  it('skips paths with empty values', () => {
    const profile = { name: '', summary: 'Has value' };
    const { nodes } = extractNodes(profile, ['name', 'summary'], true);

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.path).toBe('summary');
  });
});

describe('createKnowledgeNode', () => {
  it('creates a node with required fields', () => {
    const extracted = {
      path: 'test.path',
      content: 'Test content',
      baseImportance: 0.7,
    };

    const node = createKnowledgeNode(extracted, { id: 'node-1' });

    expect(node.id).toBe('node-1');
    expect(node.path).toBe('test.path');
    expect(node.content).toBe('Test content');
    expect(node.baseImportance).toBe(0.7);
    expect(node.narrativeImportance).toBe(0);
    expect(node.createdAt).toBeInstanceOf(Date);
    expect(node.updatedAt).toBeInstanceOf(Date);
  });

  it('sets owner IDs when provided', () => {
    const extracted = { path: 'p', content: 'c', baseImportance: 0.5 };

    const charNode = createKnowledgeNode(extracted, {
      id: '1',
      characterInstanceId: 'char-1',
    });
    expect(charNode.characterInstanceId).toBe('char-1');
    expect(charNode.settingInstanceId).toBeUndefined();

    const settingNode = createKnowledgeNode(extracted, {
      id: '2',
      settingInstanceId: 'setting-1',
    });
    expect(settingNode.settingInstanceId).toBe('setting-1');
    expect(settingNode.characterInstanceId).toBeUndefined();
  });
});

describe('nodeContentChanged', () => {
  const now = new Date();
  const baseNode: KnowledgeNode = {
    id: '1',
    path: 'test',
    content: 'original',
    baseImportance: 0.5,
    narrativeImportance: 0,
    createdAt: now,
    updatedAt: now,
  };

  it('returns true when content differs', () => {
    expect(
      nodeContentChanged(baseNode, { path: 'test', content: 'changed', baseImportance: 0.5 })
    ).toBe(true);
  });

  it('returns false when content is same', () => {
    expect(
      nodeContentChanged(baseNode, { path: 'test', content: 'original', baseImportance: 0.5 })
    ).toBe(false);
  });
});

describe('diffNodes', () => {
  const now = new Date();

  function makeNode(path: string, content: string): KnowledgeNode {
    return {
      id: `id-${path}`,
      path,
      content,
      baseImportance: 0.5,
      narrativeImportance: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  function makeExtracted(path: string, content: string) {
    return { path, content, baseImportance: 0.5 };
  }

  it('identifies nodes to create', () => {
    const existing: KnowledgeNode[] = [];
    const extracted = [makeExtracted('new', 'new content')];

    const diff = diffNodes(existing, extracted);

    expect(diff.toCreate).toHaveLength(1);
    expect(diff.toCreate[0]?.path).toBe('new');
    expect(diff.toUpdate).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
    expect(diff.toRemove).toHaveLength(0);
  });

  it('identifies nodes to update', () => {
    const existing = [makeNode('path', 'old content')];
    const extracted = [makeExtracted('path', 'new content')];

    const diff = diffNodes(existing, extracted);

    expect(diff.toUpdate).toHaveLength(1);
    expect(diff.toUpdate[0]?.existing.content).toBe('old content');
    expect(diff.toUpdate[0]?.extracted.content).toBe('new content');
  });

  it('identifies unchanged nodes', () => {
    const existing = [makeNode('path', 'same content')];
    const extracted = [makeExtracted('path', 'same content')];

    const diff = diffNodes(existing, extracted);

    expect(diff.unchanged).toHaveLength(1);
    expect(diff.toUpdate).toHaveLength(0);
  });

  it('identifies nodes to remove', () => {
    const existing = [makeNode('removed', 'content')];
    const extracted: ReturnType<typeof makeExtracted>[] = [];

    const diff = diffNodes(existing, extracted);

    expect(diff.toRemove).toHaveLength(1);
    expect(diff.toRemove[0]?.path).toBe('removed');
  });
});
