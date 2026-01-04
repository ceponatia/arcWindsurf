import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SCORING_WEIGHTS,
  applyNarrativeDecay,
  boostNarrativeImportance,
  computeScore,
  computeTotalImportance,
  cosineSimilarity,
  filterByMinScore,
  scoreAndRankNodes,
  scoreNode,
} from '../src/scoring/index.js';
import type { KnowledgeNode, ScoredNode } from '../src/types.js';

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

describe('cosineSimilarity', () => {
  const cases = [
    { name: 'identical vectors', a: [1, 0], b: [1, 0], expected: 1 },
    { name: 'orthogonal vectors', a: [1, 0], b: [0, 1], expected: 0 },
    { name: 'colinear positive', a: [1, 2], b: [2, 4], expected: 1 },
    { name: 'zero magnitude returns 0', a: [0, 0], b: [0, 0], expected: 0 },
  ];

  cases.forEach(({ name, a, b, expected }) => {
    it(name, () => {
      expect(cosineSimilarity(a, b)).toBeCloseTo(expected, 5);
    });
  });

  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow('Vector dimension mismatch');
  });
});

describe('computeTotalImportance', () => {
  it('adds base and narrative importance', () => {
    const node = makeNode({ baseImportance: 0.4, narrativeImportance: 0.3 });
    expect(computeTotalImportance(node)).toBeCloseTo(0.7);
  });
});

describe('computeScore', () => {
  it('combines similarity and importance with weights', () => {
    const score = computeScore(0.5, 0.2, { similarity: 0.7, importance: 0.3 });
    expect(score).toBeCloseTo(0.41);
  });
});

describe('scoreNode', () => {
  it('scores using cosine similarity when embedding exists', () => {
    const node = makeNode({ embedding: [1, 0] });
    const scored = scoreNode(node, [1, 0]);
    expect(scored.similarity).toBeCloseTo(1);
    expect(scored.score).toBeGreaterThan(0);
  });

  it('falls back to importance when embedding missing', () => {
    const node = makeNode({ baseImportance: 0.5 });
    const scored = scoreNode(node, [1, 0]);
    expect(scored.similarity).toBe(0);
    expect(scored.score).toBeCloseTo(0.15); // 0 importance weight 0.3
  });
});

describe('scoreAndRankNodes', () => {
  it('returns nodes sorted by score descending', () => {
    const nodes = [
      makeNode({ id: 'a', embedding: [1, 0], baseImportance: 0.2 }),
      makeNode({ id: 'b', embedding: [0, 1], baseImportance: 0.9 }),
    ];

    const scored = scoreAndRankNodes(nodes, [1, 0]);
    expect(scored.map((s) => s.node.id)).toEqual(['a', 'b']);
  });
});

describe('filterByMinScore', () => {
  it('filters out nodes below threshold', () => {
    const nodes: ScoredNode[] = [
      { node: makeNode({ id: 'keep' }), similarity: 0, totalImportance: 0, score: 0.5 },
      { node: makeNode({ id: 'drop' }), similarity: 0, totalImportance: 0, score: 0.1 },
    ];

    const filtered = filterByMinScore(nodes, 0.2);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.node.id).toBe('keep');
  });
});

describe('applyNarrativeDecay', () => {
  const cases = [
    { current: 1, factor: 0.5, expected: 0.5 },
    { current: 0.0005, factor: 0.5, expected: 0 },
  ];

  cases.forEach(({ current, factor, expected }) => {
    it(`decays ${current} with factor ${factor}`, () => {
      expect(applyNarrativeDecay(current, factor)).toBeCloseTo(expected);
    });
  });
});

describe('boostNarrativeImportance', () => {
  it('adds boost up to max', () => {
    const cases = [
      { current: 0.2, boost: 0.3, max: 1, expected: 0.5 },
      { current: 0.9, boost: 0.3, max: 1, expected: 1 },
    ];

    cases.forEach(({ current, boost, max, expected }) => {
      expect(boostNarrativeImportance(current, boost, max)).toBeCloseTo(expected);
    });
  });
});

describe('DEFAULT_SCORING_WEIGHTS', () => {
  it('prefers similarity over importance', () => {
    expect(DEFAULT_SCORING_WEIGHTS.similarity).toBeGreaterThan(DEFAULT_SCORING_WEIGHTS.importance);
  });
});
