/**
 * In-memory retrieval service for knowledge nodes.
 *
 * This implementation provides scoring and retrieval without database dependencies,
 * making it suitable for testing and environments where pgvector isn't available.
 * A database-backed implementation can extend or replace this.
 */

import type {
  RetrievalService,
  RetrievalQuery,
  RetrievalResult,
  RetrievalConfig,
  RetrievalMetadata,
  KnowledgeNode,
  ScoredNode,
  ScoringWeights,
  NodeIngestionInput,
  NodeIngestionResult,
  EmbeddingService,
} from './types.js';

import {
  DEFAULT_SCORING_WEIGHTS,
  scoreAndRankNodes,
  filterByMinScore,
  applyNarrativeDecay,
  boostNarrativeImportance,
} from './scoring.js';

import { extractNodes, createKnowledgeNode, diffNodes } from './extraction.js';

/**
 * Default retrieval configuration.
 */
export const DEFAULT_RETRIEVAL_CONFIG: Required<RetrievalConfig> = {
  weights: DEFAULT_SCORING_WEIGHTS,
  defaultMaxNodes: 10,
  defaultMinScore: 0.1,
  narrativeDecayFactor: 0.95,
};

/**
 * In-memory storage for knowledge nodes.
 * Keyed by node ID for quick lookup.
 */
export class NodeStore {
  private nodes = new Map<string, KnowledgeNode>();
  private byCharacterInstance = new Map<string, Set<string>>();
  private bySettingInstance = new Map<string, Set<string>>();
  private nextId = 1;

  /**
   * Generate a unique node ID.
   */
  generateId(): string {
    return `node_${this.nextId++}`;
  }

  /**
   * Add or update a node.
   */
  set(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);

    // Update instance indexes
    if (node.characterInstanceId) {
      let set = this.byCharacterInstance.get(node.characterInstanceId);
      if (!set) {
        set = new Set();
        this.byCharacterInstance.set(node.characterInstanceId, set);
      }
      set.add(node.id);
    }

    if (node.settingInstanceId) {
      let set = this.bySettingInstance.get(node.settingInstanceId);
      if (!set) {
        set = new Set();
        this.bySettingInstance.set(node.settingInstanceId, set);
      }
      set.add(node.id);
    }
  }

  /**
   * Get a node by ID.
   */
  get(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes for a character instance.
   */
  getByCharacterInstance(instanceId: string): KnowledgeNode[] {
    const ids = this.byCharacterInstance.get(instanceId);
    if (!ids) return [];
    return [...ids].map((id) => this.nodes.get(id)).filter(Boolean) as KnowledgeNode[];
  }

  /**
   * Get all nodes for a setting instance.
   */
  getBySettingInstance(instanceId: string): KnowledgeNode[] {
    const ids = this.bySettingInstance.get(instanceId);
    if (!ids) return [];
    return [...ids].map((id) => this.nodes.get(id)).filter(Boolean) as KnowledgeNode[];
  }

  /**
   * Delete a node.
   */
  delete(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove from indexes
    if (node.characterInstanceId) {
      this.byCharacterInstance.get(node.characterInstanceId)?.delete(id);
    }
    if (node.settingInstanceId) {
      this.bySettingInstance.get(node.settingInstanceId)?.delete(id);
    }

    return this.nodes.delete(id);
  }

  /**
   * Get all nodes.
   */
  getAll(): KnowledgeNode[] {
    return [...this.nodes.values()];
  }

  /**
   * Clear all nodes.
   */
  clear(): void {
    this.nodes.clear();
    this.byCharacterInstance.clear();
    this.bySettingInstance.clear();
  }
}

/**
 * In-memory implementation of RetrievalService.
 */
export class InMemoryRetrievalService implements RetrievalService {
  private readonly config: Required<RetrievalConfig>;
  private readonly store: NodeStore;
  private readonly embeddingService: EmbeddingService | undefined;

  constructor(
    config: RetrievalConfig = {},
    embeddingService?: EmbeddingService,
    store?: NodeStore
  ) {
    this.config = {
      ...DEFAULT_RETRIEVAL_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_RETRIEVAL_CONFIG.weights,
        ...config.weights,
      },
    };
    this.store = store ?? new NodeStore();
    this.embeddingService = embeddingService;
  }

  /**
   * Retrieve relevant knowledge nodes for a query.
   */
  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTime = Date.now();

    // Gather candidate nodes
    const candidates: KnowledgeNode[] = [];

    if (query.characterInstanceId) {
      candidates.push(...this.store.getByCharacterInstance(query.characterInstanceId));
    }
    if (query.settingInstanceId) {
      candidates.push(...this.store.getBySettingInstance(query.settingInstanceId));
    }

    // If no specific instances, search all (for testing)
    if (!query.characterInstanceId && !query.settingInstanceId) {
      candidates.push(...this.store.getAll());
    }

    // Get or compute query embedding
    let queryEmbedding = query.queryEmbedding;
    if (!queryEmbedding && this.embeddingService) {
      const [embedding] = await this.embeddingService.embed([query.queryText]);
      queryEmbedding = embedding;
    }

    // Score and rank
    const weights = this.config.weights as ScoringWeights;
    let scoredNodes: ScoredNode[];

    if (queryEmbedding) {
      scoredNodes = scoreAndRankNodes(candidates, queryEmbedding, weights);
    } else {
      // No embedding available - rank by importance only
      scoredNodes = candidates
        .map((node) => ({
          node,
          similarity: 0,
          totalImportance: node.baseImportance + node.narrativeImportance,
          score: (node.baseImportance + node.narrativeImportance) * weights.importance,
        }))
        .sort((a, b) => b.score - a.score);
    }

    // Apply filters
    const minScore = query.minScore ?? this.config.defaultMinScore;
    const maxNodes = query.maxNodes ?? this.config.defaultMaxNodes;

    let filteredNodes = filterByMinScore(scoredNodes, minScore);
    filteredNodes = filteredNodes.slice(0, maxNodes);

    const queryTimeMs = Date.now() - startTime;

    const metadata: RetrievalMetadata = {
      queryTimeMs,
      candidatesConsidered: candidates.length,
      nodesReturned: filteredNodes.length,
      weights,
    };

    return {
      nodes: filteredNodes,
      metadata,
    };
  }

  /**
   * Ingest/update knowledge nodes from a profile.
   */
  async ingestNodes(input: NodeIngestionInput): Promise<NodeIngestionResult> {
    const { characterInstanceId, settingInstanceId, profileJson, paths } = input;

    // Determine if this is a character or setting
    const isCharacter = !!characterInstanceId;

    // Extract nodes from profile
    const { nodes: extracted, errors } = extractNodes(profileJson, paths, isCharacter);

    // Get existing nodes for this instance
    const existing =
      isCharacter && characterInstanceId
        ? this.store.getByCharacterInstance(characterInstanceId)
        : settingInstanceId
          ? this.store.getBySettingInstance(settingInstanceId)
          : [];

    // Compute diff
    const diff = diffNodes(existing, extracted);

    // Track results
    let created = 0;
    let updated = 0;
    const unchanged = diff.unchanged.length;

    // Create new nodes - build options object properly for exactOptionalPropertyTypes
    for (const ext of diff.toCreate) {
      const nodeOptions: { id: string; characterInstanceId?: string; settingInstanceId?: string } =
        {
          id: this.store.generateId(),
        };
      if (characterInstanceId) {
        nodeOptions.characterInstanceId = characterInstanceId;
      }
      if (settingInstanceId) {
        nodeOptions.settingInstanceId = settingInstanceId;
      }

      const node = createKnowledgeNode(ext, nodeOptions);

      // Compute embedding if service available
      if (this.embeddingService) {
        const [embedding] = await this.embeddingService.embed([node.content]);
        if (embedding) {
          node.embedding = embedding;
        }
      }

      this.store.set(node);
      created++;
    }

    // Update changed nodes
    for (const { existing: existingNode, extracted: ext } of diff.toUpdate) {
      existingNode.content = ext.content;
      existingNode.baseImportance = ext.baseImportance;
      existingNode.updatedAt = new Date();

      // Re-compute embedding
      if (this.embeddingService) {
        const [embedding] = await this.embeddingService.embed([existingNode.content]);
        if (embedding) {
          existingNode.embedding = embedding;
        }
      }

      this.store.set(existingNode);
      updated++;
    }

    // Optionally remove nodes whose paths no longer exist
    // (For now, we keep them to preserve narrative importance)

    return {
      created,
      updated,
      unchanged,
      errors,
    };
  }

  /**
   * Update salience for accessed nodes.
   * Synchronous operation but implements async interface for DB compatibility.
   */
  updateSalience(nodeIds: string[], boost: number): Promise<void> {
    const now = new Date();

    for (const id of nodeIds) {
      const node = this.store.get(id);
      if (node) {
        node.narrativeImportance = boostNarrativeImportance(node.narrativeImportance, boost);
        node.lastAccessedAt = now;
        this.store.set(node);
      }
    }

    return Promise.resolve();
  }

  /**
   * Apply decay to narrative importance across all nodes.
   * SessionId is available for session-scoped decay in DB implementations.
   */
  applyDecay(): Promise<void> {
    const decayFactor = this.config.narrativeDecayFactor;

    for (const node of this.store.getAll()) {
      if (node.narrativeImportance > 0) {
        node.narrativeImportance = applyNarrativeDecay(node.narrativeImportance, decayFactor);
        this.store.set(node);
      }
    }

    return Promise.resolve();
  }

  /**
   * Get the underlying node store (for testing/debugging).
   */
  getStore(): NodeStore {
    return this.store;
  }
}
