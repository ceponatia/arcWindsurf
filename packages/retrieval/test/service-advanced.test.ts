import { describe, expect, it } from 'vitest';
import { InMemoryRetrievalService, NodeStore } from '../src/services/index.js';
import type { EmbeddingService, KnowledgeNode } from '../src/types.js';

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

describe('InMemoryRetrievalService advanced behavior', () => {
  it('uses embedding service when queryEmbedding missing', async () => {
    const embeddingService: EmbeddingService = {
      embed: async () => [[1, 0]],
      getDimensions: () => 2,
    };

    const store = new NodeStore();
    store.set(makeNode({ id: 'a', baseImportance: 0.2, embedding: [1, 0] }));
    store.set(makeNode({ id: 'b', baseImportance: 0.9, embedding: [0, 1] }));

    const service = new InMemoryRetrievalService({}, embeddingService, store);

    const result = await service.retrieve({ sessionId: 's1', queryText: 'hello' });

    expect(result.nodes[0]?.node.id).toBe('a');
    expect(result.metadata.candidatesConsidered).toBe(2);
  });

  it('respects maxNodes and minScore defaults and overrides', async () => {
    const service = new InMemoryRetrievalService({ defaultMaxNodes: 1, defaultMinScore: 0.6 });
    const store = service.getStore();

    store.set(makeNode({ id: 'high', baseImportance: 1 }));
    store.set(makeNode({ id: 'low', baseImportance: 0.1 }));

    const result = await service.retrieve({ sessionId: 's1', queryText: 'q' });

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.node.id).toBe('high');

    const override = await service.retrieve({
      sessionId: 's1',
      queryText: 'q',
      minScore: 0.95,
      maxNodes: 2,
    });

    expect(override.nodes).toHaveLength(1);
  });

  it('cleans index references when deleting nodes', () => {
    const store = new NodeStore();
    const node = makeNode({ id: 'c', characterInstanceId: 'char-1' });
    store.set(node);

    expect(store.getByCharacterInstance('char-1')).toHaveLength(1);
    expect(store.delete('c')).toBe(true);
    expect(store.getByCharacterInstance('char-1')).toHaveLength(0);
  });
});
