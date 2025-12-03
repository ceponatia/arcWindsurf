// Types
export * from './types.js';

// Scoring utilities
export {
  DEFAULT_SCORING_WEIGHTS,
  cosineSimilarity,
  computeTotalImportance,
  computeScore,
  scoreNode,
  scoreAndRankNodes,
  filterByMinScore,
  applyNarrativeDecay,
  boostNarrativeImportance,
} from './scoring.js';

// Extraction utilities
export {
  DEFAULT_CHARACTER_PATHS,
  DEFAULT_SETTING_PATHS,
  getPathImportance,
  getValueAtPath,
  valueToContent,
  extractNodes,
  createKnowledgeNode,
  nodeContentChanged,
  diffNodes,
  type ExtractedNode,
  type NodeUpdatePair,
  type NodeDiff,
} from './extraction.js';

// Service implementation
export { DEFAULT_RETRIEVAL_CONFIG, NodeStore, InMemoryRetrievalService } from './service.js';
