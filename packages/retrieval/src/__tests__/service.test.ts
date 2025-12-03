import { describe, it, expect, beforeEach } from 'vitest';
import { NodeStore, InMemoryRetrievalService, DEFAULT_RETRIEVAL_CONFIG } from '../service.js';
import type { KnowledgeNode, EmbeddingService } from '../types.js';

function createTestNode(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  const now = new Date();
  return {
    id: 'test-node-1',
    path: 'test.path',
    content: 'Test content',
    baseImportance: 0.5,
    narrativeImportance: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('NodeStore', () => {
  let store: NodeStore;

  beforeEach(() => {
    store = new NodeStore();
  });

  it('generates unique IDs', () => {
    const id1 = store.generateId();
    const id2 = store.generateId();
    expect(id1).not.toBe(id2);
  });

  it('stores and retrieves nodes', () => {
    const node = createTestNode({ id: 'n1' });
    store.set(node);
    expect(store.get('n1')).toBe(node);
  });

  it('retrieves nodes by character instance', () => {
    const node1 = createTestNode({ id: 'n1', characterInstanceId: 'char-1' });
    const node2 = createTestNode({ id: 'n2', characterInstanceId: 'char-1' });
    const node3 = createTestNode({ id: 'n3', characterInstanceId: 'char-2' });

    store.set(node1);
    store.set(node2);
    store.set(node3);

    const charNodes = store.getByCharacterInstance('char-1');
    expect(charNodes).toHaveLength(2);
    expect(charNodes.map((n) => n.id)).toContain('n1');
    expect(charNodes.map((n) => n.id)).toContain('n2');
  });

  it('retrieves nodes by setting instance', () => {
    const node1 = createTestNode({ id: 'n1', settingInstanceId: 'setting-1' });
    const node2 = createTestNode({ id: 'n2', settingInstanceId: 'setting-2' });

    store.set(node1);
    store.set(node2);

    const settingNodes = store.getBySettingInstance('setting-1');
    expect(settingNodes).toHaveLength(1);
    expect(settingNodes[0]?.id).toBe('n1');
  });

  it('deletes nodes', () => {
    const node = createTestNode({ id: 'n1', characterInstanceId: 'char-1' });
    store.set(node);
    expect(store.get('n1')).toBeDefined();

    store.delete('n1');
    expect(store.get('n1')).toBeUndefined();
    expect(store.getByCharacterInstance('char-1')).toHaveLength(0);
  });

  it('clears all nodes', () => {
    store.set(createTestNode({ id: 'n1' }));
    store.set(createTestNode({ id: 'n2' }));
    store.clear();
    expect(store.getAll()).toHaveLength(0);
  });
});

describe('InMemoryRetrievalService', () => {
  let service: InMemoryRetrievalService;

  beforeEach(() => {
    service = new InMemoryRetrievalService();
  });

  describe('retrieve', () => {
    it('returns empty result when no nodes exist', async () => {
      const result = await service.retrieve({
        sessionId: 'session-1',
        queryText: 'test query',
      });

      expect(result.nodes).toHaveLength(0);
      expect(result.metadata.candidatesConsidered).toBe(0);
    });

    it('retrieves nodes by character instance', async () => {
      const store = service.getStore();
      store.set(
        createTestNode({
          id: 'n1',
          characterInstanceId: 'char-1',
          baseImportance: 0.8,
        })
      );

      const result = await service.retrieve({
        sessionId: 'session-1',
        queryText: 'test',
        characterInstanceId: 'char-1',
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]?.node.id).toBe('n1');
    });

    it('scores nodes by importance when no embedding available', async () => {
      const store = service.getStore();
      store.set(createTestNode({ id: 'high', baseImportance: 0.9 }));
      store.set(createTestNode({ id: 'medium', baseImportance: 0.5 }));

      const result = await service.retrieve({
        sessionId: 'session-1',
        queryText: 'test',
      });

      expect(result.nodes[0]?.node.id).toBe('high');
      expect(result.nodes[1]?.node.id).toBe('medium');
    });

    it('scores nodes by similarity when embeddings available', async () => {
      const store = service.getStore();
      store.set(
        createTestNode({
          id: 'similar',
          embedding: [1, 0, 0],
          baseImportance: 0.1,
        })
      );
      store.set(
        createTestNode({
          id: 'dissimilar',
          embedding: [0, 1, 0],
          baseImportance: 0.9,
        })
      );

      const result = await service.retrieve({
        sessionId: 'session-1',
        queryText: 'test',
        queryEmbedding: [1, 0, 0], // identical to 'similar'
      });

      // Similar node should rank first due to high similarity
      expect(result.nodes[0]?.node.id).toBe('similar');
    });

    it('respects maxNodes limit', async () => {
      const store = service.getStore();
      for (let i = 0; i < 20; i++) {
        store.set(createTestNode({ id: `n${i}`, baseImportance: 0.5 }));
      }

      const result = await service.retrieve({
        sessionId: 'session-1',
        queryText: 'test',
        maxNodes: 5,
      });

      expect(result.nodes).toHaveLength(5);
    });

    it('filters by minScore', async () => {
      const store = service.getStore();
      store.set(createTestNode({ id: 'high', baseImportance: 0.9 }));
      store.set(createTestNode({ id: 'low', baseImportance: 0.01 }));

      const result = await service.retrieve({
        sessionId: 'session-1',
        queryText: 'test',
        minScore: 0.2,
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]?.node.id).toBe('high');
    });
  });

  describe('ingestNodes', () => {
    it('ingests nodes from a character profile', async () => {
      const profile = {
        name: 'Aria',
        summary: 'A brave adventurer',
      };

      const result = await service.ingestNodes({
        characterInstanceId: 'char-1',
        profileJson: profile,
        paths: ['name', 'summary'],
      });

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);

      const nodes = service.getStore().getByCharacterInstance('char-1');
      expect(nodes).toHaveLength(2);
    });

    it('updates existing nodes when content changes', async () => {
      // First ingestion
      await service.ingestNodes({
        characterInstanceId: 'char-1',
        profileJson: { name: 'Aria' },
        paths: ['name'],
      });

      // Second ingestion with changed content
      const result = await service.ingestNodes({
        characterInstanceId: 'char-1',
        profileJson: { name: 'Aria the Brave' },
        paths: ['name'],
      });

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);

      const nodes = service.getStore().getByCharacterInstance('char-1');
      expect(nodes[0]?.content).toBe('Aria the Brave');
    });

    it('reports unchanged nodes', async () => {
      await service.ingestNodes({
        characterInstanceId: 'char-1',
        profileJson: { name: 'Aria' },
        paths: ['name'],
      });

      const result = await service.ingestNodes({
        characterInstanceId: 'char-1',
        profileJson: { name: 'Aria' },
        paths: ['name'],
      });

      expect(result.unchanged).toBe(1);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
    });
  });

  describe('updateSalience', () => {
    it('boosts narrative importance for accessed nodes', async () => {
      const store = service.getStore();
      store.set(createTestNode({ id: 'n1', narrativeImportance: 0 }));

      await service.updateSalience(['n1'], 0.3);

      const node = store.get('n1');
      expect(node?.narrativeImportance).toBe(0.3);
      expect(node?.lastAccessedAt).toBeDefined();
    });

    it('ignores non-existent nodes', async () => {
      await expect(service.updateSalience(['nonexistent'], 0.3)).resolves.not.toThrow();
    });
  });

  describe('applyDecay', () => {
    it('decays narrative importance for all nodes', async () => {
      const store = service.getStore();
      store.set(createTestNode({ id: 'n1', narrativeImportance: 1.0 }));
      store.set(createTestNode({ id: 'n2', narrativeImportance: 0.5 }));

      await service.applyDecay();

      const n1 = store.get('n1');
      const n2 = store.get('n2');
      expect(n1?.narrativeImportance).toBe(1.0 * DEFAULT_RETRIEVAL_CONFIG.narrativeDecayFactor);
      expect(n2?.narrativeImportance).toBe(0.5 * DEFAULT_RETRIEVAL_CONFIG.narrativeDecayFactor);
    });

    it('does not affect nodes with zero narrative importance', async () => {
      const store = service.getStore();
      const originalNode = createTestNode({ id: 'n1', narrativeImportance: 0 });
      store.set(originalNode);

      await service.applyDecay();

      expect(store.get('n1')?.narrativeImportance).toBe(0);
    });
  });

  describe('with embedding service', () => {
    it('computes embeddings during ingestion', async () => {
      const mockEmbeddingService: EmbeddingService = {
        embed: (texts: string[]) => Promise.resolve(texts.map(() => [1, 0, 0])),
        getDimensions: () => 3,
      };

      const serviceWithEmbeddings = new InMemoryRetrievalService({}, mockEmbeddingService);

      await serviceWithEmbeddings.ingestNodes({
        characterInstanceId: 'char-1',
        profileJson: { name: 'Aria' },
        paths: ['name'],
      });

      const nodes = serviceWithEmbeddings.getStore().getByCharacterInstance('char-1');
      expect(nodes[0]?.embedding).toEqual([1, 0, 0]);
    });

    it('uses embedding service for queries', async () => {
      const mockEmbeddingService: EmbeddingService = {
        embed: () => Promise.resolve([[1, 0, 0]]),
        getDimensions: () => 3,
      };

      const serviceWithEmbeddings = new InMemoryRetrievalService({}, mockEmbeddingService);
      const store = serviceWithEmbeddings.getStore();
      store.set(createTestNode({ id: 'n1', embedding: [1, 0, 0] }));

      const result = await serviceWithEmbeddings.retrieve({
        sessionId: 'session-1',
        queryText: 'test',
      });

      expect(result.nodes[0]?.similarity).toBe(1);
    });
  });
});
