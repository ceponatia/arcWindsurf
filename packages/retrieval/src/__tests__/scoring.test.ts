import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  computeTotalImportance,
  computeScore,
  scoreNode,
  scoreAndRankNodes,
  filterByMinScore,
  applyNarrativeDecay,
  boostNarrativeImportance,
  DEFAULT_SCORING_WEIGHTS,
} from '../scoring.js';
import type { KnowledgeNode } from '../types.js';

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

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBe(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('returns ~0.5 for 60 degree angle', () => {
    const a = [1, 0];
    const b = [0.5, Math.sqrt(3) / 2]; // 60 degrees
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.5, 5);
  });

  it('handles zero vectors', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('dimension mismatch');
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe('computeTotalImportance', () => {
  it('sums base and narrative importance', () => {
    const node = createTestNode({ baseImportance: 0.5, narrativeImportance: 0.3 });
    expect(computeTotalImportance(node)).toBe(0.8);
  });

  it('handles zero narrative importance', () => {
    const node = createTestNode({ baseImportance: 0.7, narrativeImportance: 0 });
    expect(computeTotalImportance(node)).toBe(0.7);
  });
});

describe('computeScore', () => {
  it('uses default weights', () => {
    const similarity = 0.8;
    const importance = 0.5;
    const expected = 0.8 * 0.7 + 0.5 * 0.3; // 0.56 + 0.15 = 0.71
    expect(computeScore(similarity, importance)).toBeCloseTo(expected, 5);
  });

  it('uses custom weights', () => {
    const similarity = 0.8;
    const importance = 0.5;
    const weights = { similarity: 0.5, importance: 0.5 };
    const expected = 0.8 * 0.5 + 0.5 * 0.5; // 0.4 + 0.25 = 0.65
    expect(computeScore(similarity, importance, weights)).toBeCloseTo(expected, 5);
  });
});

describe('scoreNode', () => {
  it('scores a node with embedding', () => {
    const node = createTestNode({
      embedding: [1, 0, 0],
      baseImportance: 0.5,
      narrativeImportance: 0.2,
    });
    const queryEmbedding = [1, 0, 0]; // identical = similarity 1

    const result = scoreNode(node, queryEmbedding);

    expect(result.node).toBe(node);
    expect(result.similarity).toBe(1);
    expect(result.totalImportance).toBe(0.7);
    expect(result.score).toBeCloseTo(1 * 0.7 + 0.7 * 0.3, 5);
  });

  it('returns 0 similarity for node without embedding', () => {
    const node = createTestNode({ baseImportance: 0.5 });
    const queryEmbedding = [1, 0, 0];

    const result = scoreNode(node, queryEmbedding);

    expect(result.similarity).toBe(0);
    expect(result.score).toBe(0.5 * DEFAULT_SCORING_WEIGHTS.importance);
  });
});

describe('scoreAndRankNodes', () => {
  it('ranks nodes by score descending', () => {
    const highNode = createTestNode({
      id: 'high',
      embedding: [1, 0, 0],
      baseImportance: 0.9,
    });
    const lowNode = createTestNode({
      id: 'low',
      embedding: [0, 1, 0],
      baseImportance: 0.1,
    });
    const queryEmbedding = [1, 0, 0]; // identical to highNode

    const result = scoreAndRankNodes([lowNode, highNode], queryEmbedding);

    expect(result[0]?.node.id).toBe('high');
    expect(result[1]?.node.id).toBe('low');
  });

  it('handles empty input', () => {
    expect(scoreAndRankNodes([], [1, 0, 0])).toEqual([]);
  });
});

describe('filterByMinScore', () => {
  it('filters nodes below threshold', () => {
    const nodes = [
      { node: createTestNode({ id: '1' }), similarity: 0.8, totalImportance: 0.5, score: 0.7 },
      { node: createTestNode({ id: '2' }), similarity: 0.2, totalImportance: 0.1, score: 0.15 },
      { node: createTestNode({ id: '3' }), similarity: 0.5, totalImportance: 0.3, score: 0.4 },
    ];

    const result = filterByMinScore(nodes, 0.3);

    expect(result).toHaveLength(2);
    expect(result[0]?.score).toBe(0.7);
    expect(result[1]?.score).toBe(0.4);
  });
});

describe('applyNarrativeDecay', () => {
  it('applies decay factor', () => {
    expect(applyNarrativeDecay(1.0, 0.9)).toBe(0.9);
    expect(applyNarrativeDecay(0.5, 0.95)).toBeCloseTo(0.475, 5);
  });

  it('floors very small values to 0', () => {
    expect(applyNarrativeDecay(0.0001, 0.9)).toBe(0);
  });
});

describe('boostNarrativeImportance', () => {
  it('adds boost to current importance', () => {
    expect(boostNarrativeImportance(0.3, 0.2)).toBe(0.5);
  });

  it('caps at max importance', () => {
    expect(boostNarrativeImportance(0.9, 0.5)).toBe(1.0);
    expect(boostNarrativeImportance(0.9, 0.5, 0.8)).toBe(0.8);
  });
});
