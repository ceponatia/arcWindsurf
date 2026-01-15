/**
 * Scoring utilities for knowledge node retrieval.
 */

import type { KnowledgeNode, ScoredNode, ScoringWeights } from '../types.js';

/**
 * Default scoring weights.
 * Similarity is weighted higher since relevance to the query is primary.
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  similarity: 0.7,
  importance: 0.3,
};

/**
 * Compute cosine similarity between two vectors.
 * Returns a value in [0, 1] for normalized vectors.
 *
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity (0-1 for normalized vectors)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  if (a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a.at(i) ?? 0;
    const bVal = b.at(i) ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {
    return 0;
  }

  // Clamp to [0, 1] to handle floating point errors
  const similarity = dotProduct / magnitude;
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Compute the total importance for a knowledge node.
 * Combines base importance with narrative importance.
 *
 * @param node The knowledge node
 * @returns Total importance (0-1+, can exceed 1 with high narrative boost)
 */
export function computeTotalImportance(node: KnowledgeNode): number {
  return node.baseImportance + node.narrativeImportance;
}

/**
 * Compute the combined score for a node given a query similarity.
 *
 * Score = (similarity × w_similarity) + (importance × w_importance)
 *
 * @param similarity Cosine similarity to query (0-1)
 * @param totalImportance Total importance of the node
 * @param weights Scoring weights
 * @returns Combined score
 */
export function computeScore(
  similarity: number,
  totalImportance: number,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  return similarity * weights.similarity + totalImportance * weights.importance;
}

/**
 * Score a single knowledge node against a query embedding.
 *
 * @param node The knowledge node to score
 * @param queryEmbedding The query embedding vector
 * @param weights Scoring weights
 * @returns Scored node with similarity, importance, and combined score
 */
export function scoreNode(
  node: KnowledgeNode,
  queryEmbedding: number[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoredNode {
  // Compute similarity (0 if no embedding)
  const similarity = node.embedding ? cosineSimilarity(queryEmbedding, node.embedding) : 0;

  const totalImportance = computeTotalImportance(node);
  const score = computeScore(similarity, totalImportance, weights);

  return {
    node,
    similarity,
    totalImportance,
    score,
  };
}

/**
 * Score and rank multiple nodes against a query embedding.
 *
 * @param nodes Knowledge nodes to score
 * @param queryEmbedding The query embedding vector
 * @param weights Scoring weights
 * @returns Scored nodes sorted by score descending
 */
export function scoreAndRankNodes(
  nodes: KnowledgeNode[],
  queryEmbedding: number[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoredNode[] {
  const scoredNodes = nodes.map((node) => scoreNode(node, queryEmbedding, weights));

  // Sort by score descending
  scoredNodes.sort((a, b) => b.score - a.score);

  return scoredNodes;
}

/**
 * Filter scored nodes by minimum score threshold.
 *
 * @param nodes Scored nodes to filter
 * @param minScore Minimum score threshold
 * @returns Filtered nodes meeting the threshold
 */
export function filterByMinScore(nodes: ScoredNode[], minScore: number): ScoredNode[] {
  return nodes.filter((node) => node.score >= minScore);
}

/**
 * Apply decay to narrative importance.
 * Each call reduces narrative importance by the decay factor.
 *
 * @param currentImportance Current narrative importance
 * @param decayFactor Decay multiplier (e.g., 0.95 = 5% decay per turn)
 * @returns Decayed importance value
 */
export function applyNarrativeDecay(currentImportance: number, decayFactor: number): number {
  const decayed = currentImportance * decayFactor;
  // Floor very small values to 0 to avoid floating point accumulation
  return decayed < 0.001 ? 0 : decayed;
}

/**
 * Boost narrative importance after a node is accessed.
 *
 * @param currentImportance Current narrative importance
 * @param boost Amount to boost (typically 0.1-0.3)
 * @param maxImportance Maximum narrative importance cap
 * @returns Boosted importance value
 */
export function boostNarrativeImportance(
  currentImportance: number,
  boost: number,
  maxImportance = 1.0
): number {
  return Math.min(currentImportance + boost, maxImportance);
}
