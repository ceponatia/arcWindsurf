import { describe, expect, it } from 'vitest';

import { InMemoryRetrievalService, NodeStore } from '../src/service.js';
import type { EmbeddingService, KnowledgeNode, RetrievalQuery } from '../src/types.js';

const makeNode = (overrides: Partial<KnowledgeNode> = {}): KnowledgeNode => ({
  id: 'node-1',
  path: 'path',
  content: 'content',
  baseImportance: 0.5,
  narrativeImportance: 0,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

const embeddingService: EmbeddingService = {
  embed: (texts: string[]) => Promise.resolve(texts.map(() => [0.5, 0.5])),
  getDimensions: () => 2,
};

describe('NodeStore', () => {
  it('stores, indexes, and deletes nodes', () => {
    const store = new NodeStore();
    const nodeA = makeNode({ id: 'a', characterInstanceId: 'char-1' });
    const nodeB = makeNode({ id: 'b', settingInstanceId: 'set-1' });

    store.set(nodeA);
    store.set(nodeB);

    expect(store.get('a')).toEqual(nodeA);
    expect(store.getByCharacterInstance('char-1')).toEqual([nodeA]);
    expect(store.getBySettingInstance('set-1')).toEqual([nodeB]);

    expect(store.delete('a')).toBe(true);
    expect(store.get('a')).toBeUndefined();

    store.clear();
    expect(store.getAll()).toHaveLength(0);
  });

  it('generates incremental ids', () => {
    const store = new NodeStore();
    expect(store.generateId()).toBe('node_1');
    expect(store.generateId()).toBe('node_2');
  });
});

describe('InMemoryRetrievalService.ingestNodes', () => {
  it('creates nodes from profile and embeds when service provided', async () => {
    const store = new NodeStore();
    const service = new InMemoryRetrievalService({}, embeddingService, store);

    const result = await service.ingestNodes({
      characterInstanceId: 'char-1',
      profileJson: { name: 'Aria', personality: { traits: ['brave'] } },
      paths: ['name', 'personality.traits'],
    });

    expect(result).toMatchObject({ created: 2, updated: 0, unchanged: 0 });
    const stored = store.getAll();
    expect(stored).toHaveLength(2);
    expect(stored.every((n) => Array.isArray(n.embedding))).toBe(true);
  });

  it('updates existing nodes when content changes', async () => {
    const store = new NodeStore();
    const service = new InMemoryRetrievalService({}, embeddingService, store);

    await service.ingestNodes({
      settingInstanceId: 'set-1',
      profileJson: { name: 'Town', summary: 'Quiet' },
      paths: ['name', 'summary'],
    });

    const beforeUpdate = store.getAll();
    await service.ingestNodes({
      settingInstanceId: 'set-1',
      profileJson: { name: 'Town', summary: 'Lively' },
      paths: ['name', 'summary'],
    });

    const afterUpdate = store.getAll();
    expect(afterUpdate.find((n) => n.path === 'summary')?.content).toBe('Lively');
    expect(afterUpdate[0]?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeUpdate[0]?.updatedAt.getTime() ?? 0
    );
  });
});

describe('InMemoryRetrievalService.retrieve', () => {
  it('ranks nodes by score and respects limits', async () => {
    const service = new InMemoryRetrievalService();
    const store = service.getStore();
    store.set(
      makeNode({ id: 'high', baseImportance: 1, embedding: [1, 0], characterInstanceId: 'c1' })
    );
    store.set(
      makeNode({ id: 'low', baseImportance: 0.1, embedding: [0, 1], characterInstanceId: 'c1' })
    );

    const query: RetrievalQuery = {
      sessionId: 's1',
      queryText: 'irrelevant',
      queryEmbedding: [1, 0],
      characterInstanceId: 'c1',
      maxNodes: 1,
      minScore: 0,
    };

    const { nodes, metadata } = await service.retrieve(query);

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.node.id).toBe('high');
    expect(metadata.candidatesConsidered).toBe(2);
  });

  it('falls back to importance when no embedding provided', async () => {
    const service = new InMemoryRetrievalService();
    const store = service.getStore();
    store.set(makeNode({ id: 'important', baseImportance: 0.9, characterInstanceId: 'c1' }));
    store.set(makeNode({ id: 'less', baseImportance: 0.1, characterInstanceId: 'c1' }));

    const { nodes } = await service.retrieve({
      sessionId: 's1',
      queryText: 'q',
      characterInstanceId: 'c1',
    });

    expect(nodes[0]?.node.id).toBe('important');
  });
});

describe('salience updates', () => {
  it('boosts narrative importance for accessed nodes', async () => {
    const service = new InMemoryRetrievalService();
    const store = service.getStore();
    store.set(makeNode({ id: 'boost', narrativeImportance: 0.1 }));

    await service.updateSalience(['boost'], 0.5);
    expect(store.get('boost')?.narrativeImportance).toBeCloseTo(0.6);
    expect(store.get('boost')?.lastAccessedAt).toBeInstanceOf(Date);
  });

  it('applies decay across all nodes', async () => {
    const service = new InMemoryRetrievalService({ narrativeDecayFactor: 0.5 });
    const store = service.getStore();
    store.set(makeNode({ id: 'decay', narrativeImportance: 0.4 }));

    await service.applyDecay();
    expect(store.get('decay')?.narrativeImportance).toBeCloseTo(0.2);
  });
});
