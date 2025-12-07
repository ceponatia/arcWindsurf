/**
 * Types for the retrieval and scoring system.
 * Based on dev-docs/08-knowledge-node-model.md and dev-docs/09-retrieval-and-scoring.md
 */

/**
 * A knowledge node stored in the database.
 * Represents a focused piece of information from a character or setting profile.
 */
export interface KnowledgeNode {
  /** Unique identifier */
  id: string;

  /** Owner references (one of these should be set) */
  characterInstanceId?: string;
  settingInstanceId?: string;

  /** JSON path in the source profile (e.g., 'appearance.hair', 'personality.traits') */
  path: string;

  /** Human-readable text describing this aspect */
  content: string;

  /** Vector embedding of the content */
  embedding?: number[];

  /** Intrinsic importance (0-1), based on the type of information */
  baseImportance: number;

  /** Dynamic importance from narrative events (decays over time) */
  narrativeImportance: number;

  /** When this node was last accessed/retrieved */
  lastAccessedAt?: Date;

  /** When this node was created */
  createdAt: Date;

  /** When this node was last updated */
  updatedAt: Date;
}

/**
 * Input for a retrieval query.
 */
export interface RetrievalQuery {
  /** The session to retrieve context for */
  sessionId: string;

  /** Query text (typically player input + recent context) */
  queryText: string;

  /** Optional: pre-computed embedding for the query */
  queryEmbedding?: number[];

  /** Character instance to retrieve nodes for (optional) */
  characterInstanceId?: string;

  /** Setting instance to retrieve nodes for (optional) */
  settingInstanceId?: string;

  /** Maximum number of nodes to return */
  maxNodes?: number;

  /** Minimum score threshold (0-1) */
  minScore?: number;
}

/**
 * A scored knowledge node returned from retrieval.
 */
export interface ScoredNode {
  /** The retrieved node */
  node: KnowledgeNode;

  /** Cosine similarity to the query (0-1) */
  similarity: number;

  /** Total importance (baseImportance + narrativeImportance) */
  totalImportance: number;

  /** Combined final score */
  score: number;
}

/**
 * Result of a retrieval query.
 */
export interface RetrievalResult {
  /** Scored nodes, ordered by score descending */
  nodes: ScoredNode[];

  /** Query metadata for debugging/logging */
  metadata: RetrievalMetadata;
}

/**
 * Metadata about a retrieval query.
 */
export interface RetrievalMetadata {
  /** Time taken for the query (ms) */
  queryTimeMs: number;

  /** Total candidate nodes considered */
  candidatesConsidered: number;

  /** Nodes returned after filtering */
  nodesReturned: number;

  /** Weights used for scoring */
  weights: ScoringWeights;
}

/**
 * Weights for combining similarity and importance in scoring.
 */
export interface ScoringWeights {
  /** Weight for semantic similarity (default: 0.7) */
  similarity: number;

  /** Weight for total importance (default: 0.3) */
  importance: number;
}

/**
 * Configuration for the retrieval service.
 */
export interface RetrievalConfig {
  /** Default scoring weights */
  weights?: Partial<ScoringWeights>;

  /** Default max nodes to return */
  defaultMaxNodes?: number;

  /** Default minimum score threshold */
  defaultMinScore?: number;

  /** Decay factor for narrative importance (applied per turn) */
  narrativeDecayFactor?: number;
}

/**
 * Input for ingesting/updating knowledge nodes from a profile.
 */
export interface NodeIngestionInput {
  /** Character instance ID (if ingesting character nodes) */
  characterInstanceId?: string;

  /** Setting instance ID (if ingesting setting nodes) */
  settingInstanceId?: string;

  /** The profile JSON to extract nodes from */
  profileJson: unknown;

  /** Paths to extract (if not provided, uses default paths for the entity type) */
  paths?: string[];
}

/**
 * Result of node ingestion.
 */
export interface NodeIngestionResult {
  /** Number of nodes created */
  created: number;

  /** Number of nodes updated */
  updated: number;

  /** Number of nodes unchanged */
  unchanged: number;

  /** Any errors encountered */
  errors: NodeIngestionError[];
}

/**
 * An error during node ingestion.
 */
export interface NodeIngestionError {
  /** The path that failed */
  path: string;

  /** Error message */
  message: string;
}

/**
 * Interface for the retrieval service.
 */
export interface RetrievalService {
  /**
   * Retrieve relevant knowledge nodes for a query.
   */
  retrieve(query: RetrievalQuery): Promise<RetrievalResult>;

  /**
   * Ingest/update knowledge nodes from a profile.
   */
  ingestNodes(input: NodeIngestionInput): Promise<NodeIngestionResult>;

  /**
   * Update salience for accessed nodes.
   */
  updateSalience(nodeIds: string[], boost: number): Promise<void>;

  /**
   * Apply decay to narrative importance across all nodes.
   * Some implementations may scope decay to a session.
   */
  applyDecay(sessionId?: string): Promise<void>;
}

/**
 * Interface for the embedding service.
 */
export interface EmbeddingService {
  /**
   * Compute embeddings for one or more texts.
   */
  embed(texts: string[]): Promise<number[][]>;

  /**
   * Get the dimensionality of embeddings from this service.
   */
  getDimensions(): number;
}
